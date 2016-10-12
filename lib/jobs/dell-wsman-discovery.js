// Copyright 2016, DELL, Inc.

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
<<<<<<< Updated upstream
    'JobUtils.WorkflowTool'
=======
    'JobUtils.WorkflowTool',
    'Protocol.Events'
>>>>>>> Stashed changes
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
<<<<<<< Updated upstream
    workflowTool
=======
    workflowTool,
    eventsProtocol
>>>>>>> Stashed changes
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
        
<<<<<<< Updated upstream
        this.ipList = options.ranges;
        
        this.settings = {};
        this.target = {};
        
        this.user = options.credentials.user;
        this.password = options.credentials.password;
        
        this.doInventory = options.inventory;

        assert.object(this.options);
=======
        assert.object(this.options);
        this.user = options.credentials.user;
        this.password = options.credentials.password;
        this.doInventory = options.inventory;
        this.ipRangesToProcess = 0;
>>>>>>> Stashed changes
        this.nodeId = this.context.target;
    }
    
    util.inherits(DellWsmanDiscoveryJob, BaseJob);
        

    /**
     * @memberOf DellWsmanDiscoveryJob
     */
    DellWsmanDiscoveryJob.prototype._run = function () {
    	var self = this;
<<<<<<< Updated upstream
    	var ipListTimedOut = [];
    	var countTimedOut = 0;
    	var countUnknown = 0;
=======
>>>>>>> Stashed changes
    	
		self.dell = configuration.get('dell');
        if (!self.dell || !self.dell.services.discovery) {
        	throw new errors.NotFoundError('Dell Discovery web service is not defined in wsmanConfig.json.');
        }

<<<<<<< Updated upstream
    	return self.discover()
        .then(function(result){
        	result.forEach(function(entry){
        		if(entry.status === 'SUCCESS'){
        		//	logger.debug('Discovery - found device: ' + entry.deviceType);        		
	           		if( entry.deviceType === 'IDRAC7' || entry.deviceType === 'IDRAC8' ){
	           			logger.debug('Discovery - ' + entry.summary.id + ' is ' + entry.deviceType);
	           			if(!entry.summary || !entry.summary.serviceTag) {
	           				logger.info('Discovery - iDRAC: ' + entry.ipAddress + ' has no service tag and will not be included in discovery.')
	           			} else {
		        			var newNode = {
		        					name: entry.summary.serviceTag || entry.ipAddress,
		        					type: 'compute',
		        					identifiers: [entry.summary.serviceTag, entry.summary.id],
		        			}
		        			return waterline.nodes.findByIdentifier(entry.summary.serviceTag)	        			
		        			.then(function(result){
		        				if(!result){
		        					self.createNode(newNode, entry.summary);
		        				} else {
		    						logger.info("Node: " + result.name + " with service tag: " + entry.summary.serviceTag + " already exists!");
		        				}
		        			})
	           			}
	        		}
        		} else if(entry.status === 'TIMEDOUT'){
        			countTimedOut++;
        			ipListTimedOut.push(entry.ipAddress);
        		}
        	});
        	logger.debug('Discovery - ' + countTimedOut + ' systems timed out during discovery.')
//        	ipListTimedOut.sort().forEach(function(entry){
//        		logger.debug('Discovery - ' + entry + ' (' + entry.deviceType + ') timed out during discovery')
//        	})
        	return Promise.resolve();
        })
        .then(function(){
        	self._done();
        })
        .catch(function(err){
        	logger.error(err);
        	self._done(err);
        });

=======
    	return Promise.resolve(self.discover())
//        .then(function(){
//        	self._done();
//        })
        .catch(function(err){
        	self._done(err);
        });
>>>>>>> Stashed changes
    }
    
    
    DellWsmanDiscoveryJob.prototype.createNode = function(newNode, entry){
    	
    	var self = this;
    	
        return waterline.nodes.create(newNode)
        .then(function (node_) {
<<<<<<< Updated upstream
        	logger.debug('Created Node (ID: ' + node_.id)
        	self.addCatalog(node_, entry, 'DeviceSummary');
        	var dmiCatalog = {
       				'System Information': {
       					Manufacturer: entry.manufacturer,
=======
        	logger.debug('Created Node (ID: ' + node_.id + ')');
        	self.addCatalog(node_, entry, 'DeviceSummary');
        	var dmiCatalog = {
       				'System Information': {
       					Manufacturer: entry.manufacturer || 'Dell Inc...',
>>>>>>> Stashed changes
       					'Product Name': entry.model
       				}
        	}
        	self.addCatalog(node_, dmiCatalog, 'dmi');
        	
        	var settings = {
        	    "service": "dell-wsman-obm-service",
        		"config": {"user": self.user || self.dell.credentials.user,
        					"password": self.password || self.dell.credentials.password,
        					"host": entry.id
        		}
        	}
            return waterline.obms.upsertByNode(node_.id, settings)    			
<<<<<<< Updated upstream
        	.then(function(){	                    	
                if(self.doInventory.indexOf('true') !== -1){
                	logger.info('Created Node - Starting nventory for node: ' + entry.id)
                	return workflowTool.runGraph(node_.id,
                								'Graph.Dell.Wsman.GetInventory',
                								{},
                								null,
                								self.context.proxy,
                								self.context.graphId,
                								self.taskId);
                	//return self.collectInventories(node_, entry.id);
                }
        	})
//        	.then(function(){
//        		return workflowTool.runGraph(node_.id, 'Graph.Generate.Node.Discovered.Alert', config);
//        	})
        });
    }
=======
        	.then(function(){
        		logger.debug('Publish node discovered event for node: ' + node_.id)
        		return eventsProtocol.publishNodeEvent(node_, 'discovered')
        		.then(function(){
	                if(self.doInventory.indexOf('true') !== -1){
	                	logger.info('Starting INVENTORY for node: ' + entry.id);
	                	var opts = {options: {defaults: {callback: true, verifySSL: false}}}
	                	return workflowTool.runGraph(node_.id,
	                								'Graph.Dell.Wsman.GetInventory',
	                								opts, // TODO: determine why this does not get passed to taskgraph
	                								'wsman')
	//                								null,
	//                								self.context.proxy,
	//                								self.context.graphId,
	//                								self.taskId)
	                }
        		})
        	})
        });
    };

>>>>>>> Stashed changes
    
    DellWsmanDiscoveryJob.prototype.addCatalog = function(node, summary, name) {
        var self = this;

        return Promise.resolve(summary)
<<<<<<< Updated upstream
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
                        )
                    }
                });
                return addCatalogPromises;
            }).catch(function(err) {
                logger.error("Job error processing catalog output.", {
                    error: err,
                    id: node,
                    taskContext: self.context
                });
            });
=======
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
>>>>>>> Stashed changes
    };
  
    
    
    DellWsmanDiscoveryJob.prototype.discover = function() {

    	var self = this;

    	var host = self.dell.services.discovery.host;
        var path = self.dell.services.discovery.endpoints.discoverIpRange;
        var method = 'POST';
<<<<<<< Updated upstream
        var data = {
     	       "credential":{  
      				"user": self.user || self.dell.credentials.user,
      				"password": self.password || self.dell.credentials.password
      		   },
         	   discoverIpRangeDeviceRequests:[]
        };
        self.options.ranges.forEach(function(entry){
        	var subRanges = self.getIpv4Ranges(entry);
        	subRanges.forEach(function(entry){
        		data.discoverIpRangeDeviceRequests.push(entry);
            	logger.info('Discovering IP Range: ' + entry.deviceStartIp + ' - ' + entry.deviceEndIp);
        	})
        });
        
    	return this.clientRequest(host, path, method, data)
    	.then(function(result) {
    		return result;
        });
    }

//    DellWsmanDiscoveryJob.prototype.collectInventories = function(node, ip) {
//    	var self = this;
//    	var host = self.dell.services.inventory.host;
//    	
//		var target = {
//       			address: ip,
//       			userName: self.dell.credentials.user,
//       			password: self.dell.credentials.password
//       		}
//
//    	
//        return self.clientRequest(host, self.dell.services.inventory.endpoints.hardware, 'POST', target)
//        .then(function(response) {
//        	return self.addCatalog(node, response, 'hardware');
//        })
//        .then(function() {
//            return self.clientRequest(host, self.dell.services.inventory.endpoints.software, 'POST', target)
//            .then(function(response) {
//            	return self.addCatalog(node, response, 'software');
//            })
//        .then(function() {
//            return self.clientRequest(host, self.dell.services.inventory.endpoints.nics, 'POST', target)
//            .then(function(response) {
//            	return self.addCatalog(node, response, 'nics');
//            });        	
//        })
//        })
//      };
      
=======

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
            		self.processDiscoveredSystems(result);
                });
        	});
        });        
    }

>>>>>>> Stashed changes

    DellWsmanDiscoveryJob.prototype.nextIp = function(ip, entry) {
    	var _lastIp = entry.endIp.split(".");
    	var _ip = ip.split(".");
    	
    	var current;
    	var last;
    	    	
    	for(var i=0; i<=3; i++) {
    		current |= (parseInt(_ip[i])) << ((3-i)*8);
    		last |= (parseInt(_lastIp[i])) << ((3-i)*8);
    	}
		if(current == last){
			return null;
		}

		current++;
		var next = [];
		
    	for(var i=0; i<=3; i++) {
    		next[i]= (current >> ((3-i)*8)) & 0xff;
    	}

    	return next.join('.');    		
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
<<<<<<< Updated upstream
        setups.recvTimeoutMs = 120000;
=======
        setups.recvTimeoutMs = 60000;
>>>>>>> Stashed changes
        setups.data = data || '';
        
        var http = new HttpTool();

        return http.setupRequest(setups)
        .then(function(){
            return http.runRequest();
        })
        .then(function(response){
            if (response.httpStatusCode > 206) {
<<<<<<< Updated upstream
                //logger.error('HTTP Error ', response);
                var errorMsg = _.get(response, 'body.error.message', 'IP: ' + ipAddr + ' is NOT an iDRAC.');
=======
                var errorMsg = _.get(response, 'body.error.message', 'IP is NOT an iDRAC.');
>>>>>>> Stashed changes
                throw new Error(errorMsg);
            }

            if (response.body.length > 0) {
                response.body = JSON.parse(response.body);
            }
            return response.body;
        });
<<<<<<< Updated upstream
    };

    
=======
    }

    
    /**
     * @memberOf DellWsmanDiscoveryJob
     */
    DellWsmanDiscoveryJob.prototype.processDiscoveredSystems = function (result) {
    	var self = this;
    	
    	result.forEach(function(entry){
    		if(entry.status === 'SUCCESS'){
    			var type = entry.deviceType;
           		if( type === 'IDRAC7' || type === 'IDRAC8' || type === 'CMC_FX2' || type === 'CMC'){
           			logger.info('Discovery - ' + entry.summary.id + ' is ' + entry.deviceType);
           			if(!entry.summary || !entry.summary.serviceTag) {
           				logger.info('Discovery - iDRAC: ' + entry.ipAddress + ' unable to collect summary inventory.  Node excluded.')
           			} else {
           				var devType = 'enclosure';
           				if(type.indexOf('IDRAC') !== -1){
           					devType = 'compute';
           				}
	        			var newNode = {
	        					name: entry.summary.serviceTag,
	        					type: devType,
	        					identifiers: [entry.summary.serviceTag, entry.summary.id],
	        			}
	        			return waterline.nodes.findByIdentifier(entry.summary.serviceTag)	        			
	        			.then(function(result){
	        				if(!result){
	        					self.createNode(newNode, entry.summary);
	        				} else {
	    						logger.info("Node: " + result.name + " with service tag: " + entry.summary.serviceTag + " already exists!");
	        				}
	        			})
           			}
        		}
    		} 
    	})

    	self.ipRangesToProcess--;
    	if(self.ipRangesToProcess === 0){
    		logger.info('DISCOVERY: All IP ranges processed...')
    		self._done();
    	}
    };
    
>>>>>>> Stashed changes
    return DellWsmanDiscoveryJob;
}
