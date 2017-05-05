// Copyright 2016, DELL, Inc.

'use strict';

var di = require('di'),
    urlParse = require('url-parse');

module.exports = DellWsmanTrapConfigJobFactory;
di.annotate(DellWsmanTrapConfigJobFactory, new di.Provide('Job.Dell.Wsman.GetTrapConfig'));
di.annotate(DellWsmanTrapConfigJobFactory, new di.Inject(
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

function DellWsmanTrapConfigJobFactory(
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
    var logger = Logger.initialize(DellWsmanTrapConfigJobFactory);

    /**
     * @param {Object} options task options object
     * @param {Object} context graph context object
     * @param {String} taskId running task identifier
     * @constructor
     */
    function DellWsmanTrapConfigJob(options, context, taskId) {
        DellWsmanTrapConfigJob.super_.call(this,
                                   logger,
                                   options,
                                   context,
                                   taskId);
        
        this.settings = {};
        this.target = {};

        assert.object(this.options);
        this.nodeId = this.context.target;
        this.wsman = undefined;
        this.retrys = undefined;
        this.dellConfigs = undefined;
    }
    
    util.inherits(DellWsmanTrapConfigJob, BaseJob);
        
    /**
     * @memberOf DellWsmanTrapConfigJob
     */
    DellWsmanTrapConfigJob.prototype.initJob = function () {
    	var self = this;
    	return waterline.nodes.findByIdentifier(self.nodeId)
    	.then(function(result){
    		self.nodeType = result.type;
    		if(self.nodeType !== 'compute'){
    			logger.info('Trap configuration cannot be applicable to node type: ' + self.nodeType);
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
            	throw new errors.NotFoundError('Dell Trap Configuration web service is not defined in wsmanConfig.json.');
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
       			logger.debug("OBM-initJob Target IP Address for Trap config job: " + ipAddr);
       			self.target = {
       				address: ipAddr,
       				userName: obm.config.user,
       				password: encryption.decrypt(obm.config.password)
       			}
        	});
        });
    };


    /**
     * @memberOf DellWsmanTrapConfigJob
     */
    DellWsmanTrapConfigJob.prototype._run = function () {
    	var self = this;
        return Promise.resolve(this.initJob())
    	.then(function(){
    		return self.doConfig();
    	})
		.then(function(){
    		return self._done();
    	})
        .catch(function(err) {
            self._done(err);
        });
    };
  
    
    
    DellWsmanTrapConfigJob.prototype.doConfig = function() {
    	var self = this;
    	var dell = configuration.get('dell');

        return self.wsman.clientRequest(dell.services.config.configureTraps, 'POST', self.target)
        .then(function(response) {
			logger.debug('CONFIG TRAP RESPONSE : ' + JSON.stringify(response,null,4));
        	if(response.body.response.indexOf('Successfully') === -1){
  	        	logger.error(' config trap request failed for node: ' + self.nodeId);
  	        }
        })
        .then(function() {
            return self.wsman.clientRequest(dell.services.config.updateTrapFormat, 'POST', self.target)
            .then(function(response) {
				logger.debug('CONFIG FORMAT RESPONSE : ' + JSON.stringify(response,null,4));
            	if(response.body.response.indexOf('Successfully') === -1){
  	        	logger.error(' update trap format request failed for node: ' + self.nodeId);
  	        }
            })
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
        			});
        		}
        	});
        }
    };
    
    return DellWsmanTrapConfigJob;
}
