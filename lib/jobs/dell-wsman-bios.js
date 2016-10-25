// Copyright 2016, DELL, Inc.

'use strict';

var di = require('di'),
    urlParse = require('url-parse');

module.exports = DellWsmanBiosJobFactory;
di.annotate(DellWsmanBiosJobFactory, new di.Provide('Job.Dell.Wsman.Bios'));
di.annotate(DellWsmanBiosJobFactory, new di.Inject(
    'Job.Base',
    'Logger',
    'Promise',
    'Assert',
    'Util',
    'Services.Waterline',
    'Services.Encryption',
    'Services.Configuration',
    '_',
    'JobUtils.WsmanTool',
    'Errors',
    'uuid'
));

function DellWsmanBiosJobFactory(
    BaseJob,
    Logger,
    Promise,
    assert,
    util,
    waterline,
    encryption,
    configuration,
    _,
    WsmanTool,
    errors,
    uuid
) {
    var logger = Logger.initialize(DellWsmanBiosJobFactory);

    /**
     * @param {Object} options task options object
     * @param {Object} context graph context object
     * @param {String} taskId running task identifier
     * @constructor
     */
    function DellWsmanBiosJob(options, context, taskId) {
        DellWsmanBiosJob.super_.call(this,
                                   logger,
                                   options,
                                   context,
                                   taskId);
        
        this.settings = {};
        this.target = {};

        assert.object(this.options);
        this.nodeId = this.context.target;
        this.inventories = undefined;
        this.retrys = undefined;
        this.dellConfigs = undefined;
    }
    
    util.inherits(DellWsmanBiosJob, BaseJob);
        
    /**
     * @memberOf DellWsmanBiosJob
     */
    DellWsmanBiosJob.prototype.initJob = function () {
    	var self = this;
    	return waterline.nodes.findByIdentifier(self.nodeId)
    	.then(function(result){
    		self.nodeType = result.type;
    		if(self.nodeType !== 'compute'){
    			logger.info('BIOS inventory not applicable to node type: ' + self.nodeType);
    			self.cancel();
    			return;
    		}
            return waterline.obms.findByNode(self.nodeId, 'dell-wsman-obm-service', true)
    	})
        .then(function(obm) {
            if (!obm) { throw new errors.NotFoundError('Failed to find Wsman obm settings'); }
            // obm 'host' contains ip address of node.  We need ip:port of bios web service 
            //var parse = urlParse(obm.config.host);
            self.dellConfigs = configuration.get('dell');
            if (!self.dellConfigs || !self.dellConfigs.services.ios) {
            	throw new errors.NotFoundError('Dell Configuration (BIOS) web service is not defined in wsmanConfig.json.');
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
       			logger.debug("OBM-initJob Target IP Address for BIOS job: " + ipAddr);
       			self.target = {
       				address: ipAddr,
       				userName: obm.config.user,
       				password: encryption.decrypt(obm.config.password)
       			}
   		        self.inventories = ['bios', 'boot'];
   				self.retrys = self.inventories.slice();
        	});
        });
    };


    /**
     * @memberOf DellWsmanBiosJob
     */
    DellWsmanBiosJob.prototype._run = function () {
    	var self = this;
        return Promise.resolve(this.initJob())
    	.then(function(){
    		//return self.collectBios(self.wsman)
    		return self.collectViaCallback()
    	})
        .catch(function(err) {
            self._done(err);
        });
    };
  
    
    DellWsmanBiosJob.prototype.callback = function callback(data){
   		var self = this;
   		logger.debug('Got callback for NODE: ' + self.nodeId + ' TYPE: ' + data.type);
   		return self.handleResponse(data.data, data.type)
   		.then(function(){
   			self.collectViaCallback();
   		});
   	}


    DellWsmanBiosJob.prototype.collectViaCallback = function() {
      	var self = this;
      	var type = '';
      	if(self.inventories.length === 0){
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
  			callbackGraph: 'Graph.Dell.Wsman.InventoryCallback',
  			type: type
  		}

      	var requestUri = '';
   		requestUri = self.dellConfigs.services.ios.callback;
        self._subscribeHttpResponseUuid(self.callback, callbackIdentifier);

        return self.wsman.clientRequest(requestUri, 'POST', request)
        .then(function(response) {
        	if(response.body.response.indexOf('Submitted') === -1){
  	        	logger.error(type.toUpperCase() + ' bios/boot request failed for node: ' + self.nodeId);
  	        }
  	    })
  	    .catch(function(err){
  	       	logger.error('Bios/Boot request error for node: ' + self.nodeId);
  	    })
     };

    
    DellWsmanBiosJob.prototype.collectBios = function(wsman) {
    	var self = this;
    	var dell = configuration.get('dell');

        return wsman.clientRequest(dell.services.bios.endpoints.bios, 'POST', self.target)
        .then(function(response) {
        	return self.handleResponse(response, 'biosConfig');
        })
        .then(function() {
            return wsman.clientRequest(dell.services.bios.endpoints.boot, 'POST', self.target)
            .then(function(response) {
            	return self.handleResponse(response, 'bootOrderDetail');
            })
        });
      }
      

    DellWsmanBiosJob.prototype.handleResponse = function(result, name) {
        var self = this;

        return Promise.resolve(result)
        .then(function() {
        	if(!result || _.isEmpty(result)){
        		var index = self.retrys.indexOf(name);
        		if( index !== -1){
        			self.inventories.push(self.retrys.splice(index, 1));
        			throw new Error('Node: ' + self.nodeId + ' Response for ' + name + ' data is invalid.  Scheduling ONE retry...');
        		} else {
        			throw new Error('Node: ' + self.nodeId + ' Response for ' + name + ' data is invalid.  No catalog created.');
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
    

//    DellWsmanBiosJob.prototype.handleResponse = function(result, name) {
//        var self = this;
//
//        return Promise.resolve(result)
//            .then(function() {
//            	if(!result || !result.body || _.isEmpty(result.body)){
//            		throw new Error('Node: ' + self.nodeId + ' Response for ' + name + ' is invalid.  No catalog created.');
//            	}
//                var addCatalogPromises = [];
//
//            	return waterline.catalogs.findLatestCatalogOfSource(self.nodeId, name)
//                .then(function(catalog){
//                    if (_.isEmpty(catalog)) {
//                    	logger.debug("handleResponse: Catalog (" + name + ") not found.  Creating...");
//                        addCatalogPromises.push(
//                            Promise.resolve(waterline.catalogs.create({
//                                node: self.nodeId,
//                                source: name,
//                                data: result.body
//                            }))
//                        );
//                    } else {
//                    	logger.debug("handleResponse: Catalog (" + name + ") found!  Updating...");
//                        addCatalogPromises.push(
//                            Promise.resolve(waterline.catalogs.updateByIdentifier(catalog.id, {data: result.body})) 
//                        )
//                    }
//                });
//                return addCatalogPromises;
//            }).catch(function(err) {
//                logger.error("Job error processing catalog output.", {
//                    error: err,
//                    id: self.nodeId,
//                    taskContext: self.context
//                });
//            });
//    }
    
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
        			});
        		}
        	});
        }
    };
    
    return DellWsmanBiosJob;
}
