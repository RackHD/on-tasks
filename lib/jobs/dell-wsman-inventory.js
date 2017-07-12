// Copyright 2016, DELL, Inc.

'use strict';

var di = require('di'),
    urlParse = require('url-parse');

module.exports = DellWsmanInventoryJobFactory;
di.annotate(DellWsmanInventoryJobFactory, new di.Provide('Job.Dell.Wsman.Inventory'));
di.annotate(DellWsmanInventoryJobFactory, new di.Inject(
    'Job.Base',
    'Logger',
    'Promise',
    'Util',
    'Services.Waterline',
    'Services.Encryption',
    'Services.Configuration',
    '_',
    'JobUtils.WsmanTool',
    'Errors',
    'uuid'
));

function DellWsmanInventoryJobFactory(BaseJob, Logger, Promise, util, waterline, encryption, configuration, _, WsmanTool, errors, uuid) {
    var logger = Logger.initialize(DellWsmanInventoryJobFactory);

    /**
     * @param {Object} options task options object
     * @param {Object} context graph context object
     * @param {String} taskId running task identifier
     * @constructor
     */
    function DellWsmanInventoryJob(options, context, taskId) {
        DellWsmanInventoryJob.super_.call(this,
                                   logger,
                                   options,
                                   context,
                                   taskId);
        
        this.settings = {};
        this.target = {};
        this.nodeId = this.context.target;
        this.inventories = undefined;
        this.retrys = undefined;
        this.dellConfigs = undefined;
        
        this.callback = options.callback || true;
    }
    
    util.inherits(DellWsmanInventoryJob, BaseJob);
        
    /**
     * @memberOf DellWsmanInventoryJob
     */
    DellWsmanInventoryJob.prototype.initJob = function () {
    	var self = this;
    	return waterline.nodes.findByIdentifier(self.nodeId)
    	.then(function(result){
    		self.nodeType = result.type;
            return waterline.obms.findByNode(self.nodeId, 'dell-wsman-obm-service', true)
    	})
        .then(function(obm) {
            if (!obm) { throw new errors.NotFoundError('Failed to find Wsman obm settings'); }
            // obm 'host' contains ip address of node.  We need ip:port of inventory web service 
            self.dellConfigs = configuration.get('dell');
            if (!self.dellConfigs || !self.dellConfigs.services.inventory) {
            	throw new errors.NotFoundError('Dell Inventory web service is not defined in wsmanConfig.json.');
            }
            var parse = urlParse(self.dellConfigs.gateway);
            
            var protocol = parse.protocol.replace(':','').trim();
            self.settings = {
                uri: parse.href,
                host: parse.host.split(':')[0],
                root: parse.pathname,
                port: parse.port,
                protocol: protocol,
                verifySSL: self.options.verifySSL || false,
                recvTimeoutMs: 300000
            };
            self.wsman = new WsmanTool();
            self.wsman.settings = self.settings;
            
       		return _getIpAddress(obm)
       		.then(function(ipAddr){
       			if(!ipAddr) { throw new errors.NotFoundError('No target IP address.'); }
       			//logger.debug("OBM-initJob Target IP Address for inventory job: " + ipAddr);
       			self.target = {
       				address: ipAddr,
       				userName: obm.config.user,
       				password: encryption.decrypt(obm.config.password)
       			}
       			if(self.nodeType === 'enclosure'){
       				self.inventories = ['details'];
       			} else if(self.nodeType === 'compute'){
       		        self.inventories = ['hardware', 'software', 'nics'];
       			} else {
       				throw new Error('Inventory collection for node type (' + self.nodeType + ') is not implemented.');
       			}
   				self.retrys = self.inventories.slice();
        	});
        });
    };


    /**
     * @memberOf DellWsmanInventoryJob
     */
    DellWsmanInventoryJob.prototype._run = function () {
    	var self = this;
        return Promise.resolve(this.initJob())
    	.then(function(){
    	    logger.info('Starting INVENTORY collection for (' + self.nodeType + ') node: ' + self.nodeId);
    		if(self.callback === true){
    			//logger.info('Using callbacks for inventory.');
    			return self.collectInventoryViaCallback();
    		} else {
    			return self.collectInventory(self.wsman); // TODO: Remove. Callback method is preferred
    		}
    	})
        .catch(function(err) {
            self._done(err);
        });
    };
  
    
    DellWsmanInventoryJob.prototype.inventoryCallback = function inventoryCallback(data){
   		var self = this;
   		logger.debug('Got callback for NODE: ' + self.nodeId + ' TYPE: ' + data.type);
   		var body = data.data.body || data.data;
   		return self.handleResponse(body, data.type)
   		.then(function(){
   			self.collectInventoryViaCallback();
   		});
   	}

     	
     DellWsmanInventoryJob.prototype.collectInventoryViaCallback = function() {
      	var self = this;
      	var type = '';
      	if(self.inventories.length === 0){
    	    logger.info('Completed INVENTORY collection for (' + self.nodeType + ') node: ' + self.nodeId);
      		self._done();
      		return;
      	} else {
      		type = self.inventories.shift();
      	}
      	
      	var rackHdCallback = self.dellConfigs.wsmanCallbackUri;
      	var callbackIdentifier = uuid.v4();
      	var callback = rackHdCallback.replace(/_IDENTIFIER_/, callbackIdentifier);
      	var request = {
  			credential: self.target,
  			callbackUri: callback,
  			type: type
  		}

      	var requestUri = '';
      	if(self.nodeType === 'compute'){
      		requestUri = self.dellConfigs.services.inventory.serverCallback;
      	} else if(self.nodeType === 'enclosure'){
      		requestUri = self.dellConfigs.services.inventory.chassisCallback;
      	}
        self._subscribeHttpResponseUuid(self.inventoryCallback, callbackIdentifier);

        return self.wsman.clientRequest(requestUri, 'POST', request)
        .then(function(response) {
        	if(response.body.response.indexOf('Submitted') === -1){
  	        	logger.error(type.toUpperCase() + ' inventory request failed for node: ' + self.nodeId);
  	        }
  	    })
  	    .catch(function(err){
  	       	logger.error('Inventory request error for node: ' + self.nodeId);
  	    })
     };


     // TODO: Remove. Callback method is preferred
     DellWsmanInventoryJob.prototype.collectInventory = function(wsman) {
    	var self = this;

        return wsman.clientRequest(self.dellConfigs.services.inventory.hardware, 'POST', self.target)
        .then(function(response) {
        	return self.handleResponse(response, 'hardware');
        })
        .then(function() {
            return wsman.clientRequest(self.dellConfigs.services.inventory.software, 'POST', self.target)
            .then(function(response) {
            	return self.handleResponse(response, 'software');
            })
        .then(function() {
            return wsman.clientRequest(self.dellConfigs.services.inventory.nics, 'POST', self.target)
            .then(function(response) {
            	return self.handleResponse(response, 'nics');
            });        	
        })
        })
    };
      

    DellWsmanInventoryJob.prototype.handleResponse = function(result, name) {
        var self = this;

        return Promise.resolve(result)
        .then(function() {
        	if(!result || _.isEmpty(result)){
        		var index = self.retrys.indexOf(name);
        		if( index !== -1){
        			self.inventories.push(self.retrys.splice(index, 1));
        			throw new Error('Node: ' + self.nodeId + ' Response for ' + name + ' inventory is invalid.  Scheduling ONE retry...')
        		} else {
        			throw new Error('Node: ' + self.nodeId + ' Response for ' + name + ' inventory is invalid.  No catalog created.');
        		}
        	}
            var addCatalogPromises = [];

        	return waterline.catalogs.findLatestCatalogOfSource(self.nodeId, name)
            .then(function(catalog){
                if (_.isEmpty(catalog)) {
                	logger.debug("handleResponse: Catalog (" + name + ") not found.  Creating...");
                    addCatalogPromises.push(
                        Promise.resolve(waterline.catalogs.create({
                            node: self.nodeId,
                            source: name,
                            data: result
                        }))
                    );
                } else {
                	logger.debug("handleResponse: Catalog (" + name + ") found!  Updating...");
                    addCatalogPromises.push(
                        Promise.resolve(waterline.catalogs.updateByIdentifier(catalog.id, {data: result})) 
                    )
                }
            })
            return addCatalogPromises;
        }).catch(function(err) {
            logger.error("Job error processing catalog output.", {
                error: err,
                id: self.nodeId,
                taskContext: self.context
            });
        });
    }
    
    function _getIpAddress(obm){
        var self = this;
        if(obm.config.host) {
        	return Promise.resolve(obm.config.host);
        } else {
        	return waterline.catalogs.findLatestCatalogOfSource(self.nodeId, 'DeviceSummary')
        	.then(function(catalog){
        		if (!_.isEmpty(catalog)) {
        			return catalog.data.id;
        		} else {
        			return waterline.catalogs.findLatestCatalogOfSource(self.nodeId, 'bmc')
        			.then(function(catalog){
	            		if (!_.isEmpty(catalog)) {
	            			return catalog.data['Ip Address'];
	            		} else {
	        				return undefined;
	            		}
        			})
        		}
        	});
        }
    }   
    
    return DellWsmanInventoryJob;
}
