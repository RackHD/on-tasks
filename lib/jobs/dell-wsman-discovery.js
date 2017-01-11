// Copyright 2016, DELL EMC, Inc.

'use strict';

var di = require('di'),
    urlParse = require('url-parse');

module.exports = DellWsmanDiscoveryJobFactory;
di.annotate(DellWsmanDiscoveryJobFactory, new di.Provide('Job.Dell.Wsman.Discovery'));
di.annotate(DellWsmanDiscoveryJobFactory, new di.Inject(
    'Job.Base',
    'Logger',
    'Promise',
    'Assert',
    'Util',
    'Services.Waterline',
    'Services.Lookup',
    'Services.Configuration',
    '_',
    'JobUtils.HttpTool',
    'Errors',
    'JobUtils.WorkflowTool',
    'Protocol.Events',
    'validator'
));

function DellWsmanDiscoveryJobFactory(
    BaseJob,
    Logger,
    Promise,
    assert,
    util,
    waterline,
    lookup,
    configuration,
    _,
    HttpTool,
    errors,
    workflowTool,
    eventsProtocol,
    validator
) {
    var logger = Logger.initialize(DellWsmanDiscoveryJobFactory);

    /**
     * @param {Object} options task options object
     * @param {Object} context graph context object
     * @param {String} taskId running task identifier
     * @constructor
     */
    function DellWsmanDiscoveryJob(options, context, taskId) {
        DellWsmanDiscoveryJob.super_.call(this,
                                   logger,
                                   options,
                                   context,
                                   taskId);
        
        assert.object(this.options);
        this.user = options.credentials.user;
        this.password = options.credentials.password;
        this.doInventory = options.inventory;
        this.ipRangesToProcess = 0;
        this.nodeId = this.context.target;

        this.computeNodes = [];
        this.enclosureNodes = [];

    }
    
    util.inherits(DellWsmanDiscoveryJob, BaseJob);
        

    /**
     * @memberOf DellWsmanDiscoveryJob
     */
    DellWsmanDiscoveryJob.prototype._run = function () {
    	var self = this;
    	
		self.dell = configuration.get('dell');
        if (!self.dell || !self.dell.services || !self.dell.services.discovery) {
        	throw new errors.NotFoundError('Dell Discovery web service is not defined in wsmanConfig.json.');
        }

    	return Promise.resolve(self.discover())
//        .then(function(){
//        	self._done();
//        })
        .catch(function(err){
        	self._done(err);
        });
    }
    
    DellWsmanDiscoveryJob.prototype.createNode = function(newNode, entry){
    	
    	var self = this;

        return waterline.nodes.create(newNode)
        .then(function (node_) {
        	logger.debug('Created Node (ID: ' + node_.id + ')');
        	node_.ip = entry.id;
        	if(newNode.type === 'enclosure'){
        	    self.enclosureNodes.push(node_);
        	} else {
                self.computeNodes.push(node_);
        	}
        	return self.addCatalog(node_, entry, 'DeviceSummary')
        	.then(function(){
                var dmiCatalog = {
                        'System Information': {
                            Manufacturer: entry.manufacturer || 'Dell Inc...',
                            'Product Name': entry.model
                        }
                }
                return self.addCatalog(node_, dmiCatalog, 'dmi')
            })
        	.then(function(){
        	    return Promise.resolve(node_);
        	})
        });
    };

    
    DellWsmanDiscoveryJob.prototype.addCatalog = function(node, summary, name) {
        var self = this;

        return Promise.resolve(summary)
        .then(function() {
            var addCatalogPromises = [];

        	return waterline.catalogs.findLatestCatalogOfSource(node.id, name)
            .then(function(catalog){
                if (_.isEmpty(catalog)) {
                	logger.info("addCatalog: Catalog (" + name + ") not found.  Creating...");
                    addCatalogPromises.push(
                        Promise.resolve(waterline.catalogs.create({
                            node: node.id,
                            source: name,
                            data: summary
                        }))
                    );
                } else {
                	logger.info("addCatalog: Catalog (" + name + ") found!  Updating...");
                    addCatalogPromises.push(
                        Promise.resolve(waterline.catalogs.updateByIdentifier(catalog.id, {data: summary})) 
                    );
                }
            })
            return addCatalogPromises;
        }).catch(function(err) {
            logger.error("Job error processing catalog output.", {
                error: err,
                id: node,
                taskContext: self.context
            });
        });
    };
  
    
    
    DellWsmanDiscoveryJob.prototype.discover = function() {

    	var self = this;

    	var host = self.dell.gateway;
        var path = self.dell.services.discovery.range;
        var method = 'POST';

        self.options.ranges.forEach(function(entry){
            if(!validator.isIP(entry.startIp) || !validator.isIP(entry.endIp)){
                throw new Error('Invalid IP range: (' + entry.startIp + ' - ' + entry.endIp + ')');
            }
        });
        self.options.ranges.forEach(function(entry){
        	var subRanges = self.getIpv4Ranges(entry);
        	self.ipRangesToProcess += subRanges.length;
        	subRanges.forEach(function(entry){
                var data = {
              	       "credential":{  
               				"user": self.user || self.dell.credentials.user,
               				"password": self.password || self.dell.credentials.password
               		   },
                  	   discoverIpRangeDeviceRequests:[]
                 };        		
        		data.discoverIpRangeDeviceRequests.push(entry);
            	logger.info('Discovering IP Range: ' + entry.deviceStartIp + ' - ' + entry.deviceEndIp);
            	return self.clientRequest(host, path, method, data)
            	.then(function(result) {
            		return self.processDiscoveredSystems(result, data.credential);
                })
        	});
        });
    }


    DellWsmanDiscoveryJob.prototype.getIpv4Ranges = function(entry) {
    	
    	var _lastIp = entry.endIp.split(".");
    	var _firstIp = entry.startIp.split(".");
    	
    	var current;
    	var last;
    	
    	for(var i=0; i<=3; i++) {
    		current |= (parseInt(_firstIp[i])) << ((3-i)*8);
    		last |= (parseInt(_lastIp[i])) << ((3-i)*8);
    	}
		if((current & 0xffffff00) == (last & 0xffffff00)){ // this is a valid range
			logger.debug('GetRanges - Passed in range is valid... returning');
			return [{
 	 	       "deviceType": null,
	 	       "deviceStartIp": entry.startIp,
	 	       "deviceEndIp": entry.endIp,
	 	       "credential": entry.credentials || null
			}];
		}
		
    	var start = [];
    	var end = [];
    	var ranges = [];
    	var newRange = {  
    	 	       "deviceType": null,
    	 	       "deviceStartIp": entry.startIp,
    	 	       "deviceEndIp": null,
    	 	       "credential": entry.credentials || null
    		       }        

    	current |= 0xFF;
    	for(var i=0; i<=3; i++) {
    		end[i] = (current >> ((3-i)*8)) & 0xff;
    	}
    	newRange.deviceEndIp = end.join('.');
    	ranges.push(newRange);    
		logger.debug('GetRanges - First sub range: ' + JSON.stringify(newRange));

		current += 2;  // increment from x.x.x.255 to x.x.x+1.1
		
		while((current & 0xffffff00) != (last & 0xffffff00)){
	    	for(var i=0; i<=3; i++) {
	    		start[i] = (current >> ((3-i)*8)) & 0xff;
	    		if(i==3){
	    			end[i] = 0xFF;
	    		} else {
	    			end[i] = (current >> ((3-i)*8)) & 0xff;
	    		}
	    	}
	    	var newRange = {  
	    	 	       "deviceType": null,
	    	 	       "deviceStartIp": null,
	    	 	       "deviceEndIp": null,
	    	 	       "credential": entry.credentials || null
	    		       }        
	    	newRange.deviceStartIp = start.join('.');
	    	newRange.deviceEndIp = end.join('.');
	    	ranges.push(newRange);
			logger.debug('GetRanges - Sub range: ' + JSON.stringify(newRange));
	    	
	    	current += 256;  // increment from x.x.x.255 to x.x.x+1.1
		}
		
    	for(var i=0; i<=3; i++) {
    		start[i] = (current >> ((3-i)*8)) & 0xff;
   			end[i] = (last >> ((3-i)*8)) & 0xff;
    	}

    	var newRange = {  
 	 	       "deviceType": null,
 	 	       "deviceStartIp": null,
 	 	       "deviceEndIp": null,
 	 	       "credential": null
 		       }        
    	newRange.deviceStartIp = start.join('.');
    	newRange.deviceEndIp = end.join('.');
    	ranges.push(newRange);
		logger.debug('GetRanges - Last sub range: ' + JSON.stringify(newRange));

    	return ranges;
    }

   
    DellWsmanDiscoveryJob.prototype.clientRequest = function(host, path, method, data) {
        var self = this;

        var parse = urlParse(host);
        
        var setups = {};

        setups.url = {};
        setups.url.protocol = parse.protocol.replace(':','').trim();
        setups.url.host = parse.host.split(':')[0];
        setups.url.port = parse.port;
        setups.url.path = path || '/';

        setups.method = method || 'GET';
        setups.credential = {};
        setups.verifySSl = false;
        setups.headers = {'Content-Type': 'application/json'};
        setups.recvTimeoutMs = 60000;
        setups.data = data || '';
        
        var http = new HttpTool();

        return http.setupRequest(setups)
        .then(function(){
            return http.runRequest();
        })
        .then(function(response){
            if (response.httpStatusCode > 206) {
                logger.debug(JSON.stringify(response, null, 4));
                var errorMsg = _.get(response, 'body.error.message', 'IP is NOT an iDRAC.');
                throw new Error(errorMsg);
            }

            if (response.body.length > 0) {
                response.body = JSON.parse(response.body);
            }
            return response.body;
        });
    }

    
    /**
     * @memberOf DellWsmanDiscoveryJob
     */
    DellWsmanDiscoveryJob.prototype.processDiscoveredSystems = function (result, credential) {
    	var self = this;
        var devices = [];
    	Promise.resolve(result)
    	.then(function(result){
    	    result.forEach(function(entry){
    	        if(entry.status === 'SUCCESS'){
                    var type = entry.deviceType;
                    if( type === 'IDRAC7' || type === 'IDRAC8' || type === 'CMC_FX2' || type === 'CMC'){
                        if(!entry.summary || !entry.summary.serviceTag) {
                            logger.info('Discovery - iDRAC: ' + entry.ipAddress + ' unable to collect summary inventory.  Node excluded.');
                        } else {
            	            devices.push(entry);
            	        }
            	    }
    	        }
    	    });
    	    var nodesToProcess = devices.length;
    	    if(nodesToProcess === 0){
    	        if(--self.ipRangesToProcess === 0){
                    logger.info('DISCOVERY: All IP ranges processed.');
                    self._done();
    	        }
    	    }
            devices.forEach(function(entry){
                var type = entry.deviceType;
                var devType = 'enclosure';
                if(type.indexOf('IDRAC') !== -1){
                    devType = 'compute';
                }
                var newNode = {
                        name: entry.summary.serviceTag,
                        type: devType,
                        identifiers: [entry.summary.serviceTag, entry.summary.id],
                        relations: []
                }
                return waterline.nodes.findByIdentifier(entry.summary.serviceTag)
                .then(function(result){
                    if(!result){
                        return self.createNode(newNode, entry.summary)
                        .then(function(node_){
                            logger.debug('Publish node discovered event for node: ' + node_.id)
                            return eventsProtocol.publishNodeEvent(node_, 'discovered')
                            .then(function(){
                                if(self.doInventory.indexOf('true') !== -1){
                                    logger.info('Starting POST DISCOVERY for node: ' + entry.summary.id);
                                    var opts = {
                                                   defaults: {
                                                       data: entry,
                                                       credentials: credential
                                                   }
                                               }
                                    return workflowTool.runGraph(node_.id,
                                                                'Graph.Dell.Wsman.PostDiscovery',
                                                                opts
                                                                )
                //                								null,
                //                								self.context.proxy,
                //                								self.context.graphId,
                //                								self.taskId)
                                }
                            })
                            .then(function(){
                                if(--nodesToProcess === 0){
                                    self.ipRangesToProcess--;
                                    logger.debug('IP Ranges left to process: ' + self.ipRangesToProcess);
                                    if(self.ipRangesToProcess === 0){
                                        logger.info('DISCOVERY: All IP ranges processed.');
                                        self._done();
                                    }
                                }
                            })
                        })
                    } else {
                        --nodesToProcess;
                        logger.info("Node: " + result.name + " with service tag: " + entry.summary.serviceTag + " already exists!");
                        if(nodesToProcess === 0){
                            self.ipRangesToProcess--;
                            logger.debug('IP Ranges left to process: ' + self.ipRangesToProcess);
                            if(self.ipRangesToProcess === 0){
                                logger.info('DISCOVERY: All IP ranges processed.');
                                self._done();
                            }
                        }
                    }
                })
            })
    	})
    };

    return DellWsmanDiscoveryJob;
}
