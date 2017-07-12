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
    'HttpTool',
    'Errors',
    'JobUtils.WorkflowTool',
    'Protocol.Events',
    'validator',
    'JobUtils.RedfishTool'
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
    validator,
    RedfishTool
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
        this.userName = options.credentials.userName;
        this.password = options.credentials.password;
        this.deviceTypesToDiscover = [];
        this.doInventory = options.inventory;
        this.ipRangesToProcess = 0;
        this.nodeId = this.context.target;

        this.newComputeNodes = [];
        this.newChassisNodes = [];
        this.newSwitchNodes = [];
        this.newStorageNodes = [];
        this.newIomNodes = [];
        this.generatedEnclosureNodes = [];
        this.tmpNodeArray = [];

        this.generatedRangeRequest = [];
        this.credentialMapping = [];
        this.redfish = new RedfishTool();
        this.nodesToProcess = 0;

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
        .catch(function(err){
        	self._done(err);
        });
    }


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
                return addCatalogPromises;
            })
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

        if(self.options.deviceTypesToDiscover) {
            if(_.isArray(self.options.deviceTypesToDiscover)) {
                // this is for all ranges unless overridden at the range level
                self.deviceTypesToDiscover = self.options.deviceTypesToDiscover;
            } else {
                throw new Error('deviceTypesToDiscover must be an array. ex: ["SERVER", "CHASSIS"]');
            }
        }
        self.options.ranges.forEach(function(entry){
            if(!validator.isIP(entry.startIp) || !validator.isIP(entry.endIp)){
                throw new Error('Invalid IP range: (' + entry.startIp + ' - ' + entry.endIp + ')');
            }
            if(entry.deviceTypesToDiscover && !_.isArray(entry.deviceTypesToDiscover)) {
                throw new Error('deviceTypesToDiscover must be an array for range: (' + range.startIp + ' - ' + range.endIp + ')');
            }
        });
        if(!self.doInventory) {
            self.doInventory = 'false';
        } else {
            if(_.isBoolean(self.doInventory)) {
                if(self.doInventory === true) {
                    self.doInventory = 'true';
                } else {
                    self.doInventory = 'false';
                }
            }
        }

        var discoverIpRanges = [];
        self.options.ranges.forEach(function(range){
            if(!range.credentials || !range.credentials.userName || !range.credentials.password) {
                if(!self.options.credentials || !self.options.credentials.userName || !self.options.credentials.password) {
                    throw new Error('No credentials provided for range: (' + range.startIp + ' - ' + range.endIp + ')');
                } else {
                    range.credentials = self.options.credentials;
                }
            }
            if(!range.deviceTypesToDiscover || _.isEmpty(range.deviceTypesToDiscover)){
                if(!_.isEmpty(self.deviceTypesToDiscover)) {
                    range.deviceTypesToDiscover = self.deviceTypesToDiscover;
                }
            }
        	var subRanges = self.getIpv4Ranges(range);
        	self.ipRangesToProcess += subRanges.length;

        	subRanges.forEach(function(entry){
        	    discoverIpRanges.push(entry);
            	logger.debug('Discovering IP Range: ' + entry.deviceStartIp + ' - ' + entry.deviceEndIp);
            })
        });
        // At this point, we've assigned a credential to every range, so we just pass null userName/password
        // to the service as a global credential is required
        var data = {
               "credential":{
                    "userName": null,
                    "password": null
               },
               discoverIpRangeDeviceRequests: discoverIpRanges
        };
        self.generatedRangeRequest = discoverIpRanges;
        return Promise.resolve(self.generateCredentialMapping())
        .then(function(){
            logger.info('IP Range discovery submitted...');
            logger.debug('DISCOVERY SERVICE PAYLOAD: ' + JSON.stringify(data, null, 4));
            return self.clientRequest(host, path, method, data)
            .then(function(result) {
                return self.processDiscoveredDevices(result, data.credential);
            })
        });
    }


    DellWsmanDiscoveryJob.prototype.generateCredentialMapping = function() {
        var self = this;
        var ipToCredential = [];
        this.generatedRangeRequest.forEach(function(range){
            var _lastIp = range.deviceEndIp.split(".");
            var _firstIp = range.deviceStartIp.split(".");

            var first;
            var last;

            for(var i=0; i<=3; i++) {
                first |= (parseInt(_firstIp[i])) << ((3-i)*8);
                last |= (parseInt(_lastIp[i])) << ((3-i)*8);
            }
            var entry = {
                "firstIp": first,
                "lastIp": last,
                "credential": range.credential
            }
            ipToCredential.push(entry);
        })
        self.credentialMapping = ipToCredential;
        return ipToCredential;
    }

    DellWsmanDiscoveryJob.prototype.getCredential = function(ip, mapping) {
        var self = this;
        var _ip = ip.split(".");
        var ipd;
        for(var i=0; i<=3; i++) {
            ipd |= (parseInt(_ip[i])) << ((3-i)*8);
        }
        for(var i=0; i<mapping.length; i++){
            var range = mapping[i];
            if(ipd >= range.firstIp && ipd <= range.lastIp){
                logger.debug('Found credential for Node: ' + ip);
                return range.credential;
            }
        }
        logger.error('No credential found for Node ' + ip);
        return undefined;
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
 	 	       "deviceType": entry.deviceTypesToDiscover,
	 	       "deviceStartIp": entry.startIp,
	 	       "deviceEndIp": entry.endIp,
	 	       "credential": entry.credentials
			}];
		}

    	var start = [];
    	var end = [];
    	var ranges = [];
    	var newRange = {
    	 	       "deviceType": entry.deviceTypesToDiscover,
    	 	       "deviceStartIp": entry.startIp,
    	 	       "deviceEndIp": null,
    	 	       "credential": entry.credentials
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
	    	 	       "deviceType": entry.deviceTypesToDiscover,
	    	 	       "deviceStartIp": null,
	    	 	       "deviceEndIp": null,
	    	 	       "credential": entry.credentials
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
 	 	       "deviceType": entry.deviceTypesToDiscover,
 	 	       "deviceStartIp": null,
 	 	       "deviceEndIp": null,
 	 	       "credential": entry.credentials
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
        setups.recvTimeoutMs = 1800000;
        setups.data = data || '';

        var http = new HttpTool();

        return http.setupRequest(setups)
        .then(function(){
            return http.runRequest();
        })
        .then(function(response){
            if (response.httpStatusCode > 206) {
                logger.error('HTTP Error', response);
                throw new Error(response.body);
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
    DellWsmanDiscoveryJob.prototype.collectInventory = function (device, node) {
        var self = this;
        if(self.doInventory.indexOf('true') !== -1  && device !== null){
            if(self.newChassisNodes.indexOf(node.id) !== -1 || self.newComputeNodes.indexOf(node.id) !== -1){
                logger.info('Starting POST DISCOVERY config for node: ' + node.name);
                workflowTool.runGraph(node.id, 'Graph.Dell.Wsman.PostDiscovery', null);
            }
        }
        return Promise.resolve();
    }


    /**
     * @memberOf DellWsmanDiscoveryJob
     */
    DellWsmanDiscoveryJob.prototype.doPublishDiscovered = function (node) {
        logger.debug('Publish node discovered event for node: ' + node.id)
        return Promise.resolve(eventsProtocol.publishNodeEvent(node, 'discovered'));
    }


    /**
     * @memberOf DellWsmanDiscoveryJob
     */
    DellWsmanDiscoveryJob.prototype.processStorage = function (deviceList) {
        var self = this;
        deviceList.forEach(function(entry){
            logger.info('Processing Storage - ' + 'TYPE: ' + entry.deviceName + ' | COUNT: ' + entry.discovered);
            entry.discoveredDeviceInfoList.forEach(function(device){
                var newNode = {
                        name: device.ipAddress,
                        type: 'storage',
                        identifiers: [device.ipAddress],
                        relations: []
                }
                if(device.macAddress){
                    newNode.identifiers.push(device.macAddress);
                }
                return waterline.nodes.findByIdentifier(newNode.name)
                .then(function(result){
                    if(!result){
                        return waterline.nodes.create(newNode)
                        .then(function (node_) {
                            logger.info('Created Storage Node (ID: ' + node_.id + ')');
                            self.newStorageNodes.push(node_.id);
                            node_.ip = device.ipAddress;
                            return self.doPublishDiscovered(node_)
                           .then(function(){
                               self.checkAllNodesProcessed();
                               if(self.doInventory.indexOf('true') !== -1) {
                                   return self.collectInventory(device, node_);
                               }
                           })
                        })
                    } else {
                        logger.info('Node: ' + newNode.name + ' TYPE: ' + entry.deviceName + ' already exists... Skipping.');
                        self.checkAllNodesProcessed();
                    }
                })
                .catch(function(err){
                    logger.error(err.errorMsg);
                    self.checkAllNodesProcessed();
                })
            })
        })
        return Promise.resolve();
    }


    /**
     * @memberOf DellWsmanDiscoveryJob
     */
    DellWsmanDiscoveryJob.prototype.processIom = function (deviceList) {
        var self = this;
        deviceList.forEach(function(entry){
            logger.info('Processing IOM - ' + 'TYPE: ' + entry.deviceName + ' | COUNT: ' + entry.discovered);
            entry.discoveredDeviceInfoList.forEach(function(device){
                var newNode = {
                        name: device.ipAddress,
                        type: 'iom',
                        identifiers: [device.ipAddress],
                        relations: []
                }
                if(device.macAddress){
                    newNode.identifiers.push(device.macAddress);
                }
                return waterline.nodes.findByIdentifier(newNode.name)
                .then(function(result){
                    if(!result){
                        return waterline.nodes.create(newNode)
                        .then(function (node_) {
                            logger.info('Created IOM Node (ID: ' + node_.id + ')');
                            self.newIomNodes.push(node_.id);
                            node_.ip = device.ipAddress;
                            return self.doPublishDiscovered(node_)
                           .then(function(){
                               self.checkAllNodesProcessed();
                               if(self.doInventory.indexOf('true') !== -1) {
                                   return self.collectInventory(device, node_);
                               }
                           })
                        })
                    } else {
                        logger.info('Node: ' + newNode.name + ' TYPE: ' + entry.deviceName + ' already exists... Skipping.');
                        self.checkAllNodesProcessed();
                    }
                })
                .catch(function(err){
                    logger.error(err.errorMsg);
                    self.checkAllNodesProcessed();
                })
            })
        })
        return Promise.resolve(deviceList);
    }


    /**
     * @memberOf DellWsmanDiscoveryJob
     */
    DellWsmanDiscoveryJob.prototype.processSwitch = function (deviceList) {
        var self = this;
        deviceList.forEach(function(entry){
            logger.info('Processing Switch - ' + 'TYPE: ' + entry.deviceName + ' | COUNT: ' + entry.discovered);
            entry.discoveredDeviceInfoList.forEach(function(device){
                var newNode = {
                        name: device.ipAddress,
                        type: 'switch',
                        identifiers: [device.ipAddress],
                        relations: []
                }
                if(device.macAddress){
                    newNode.identifiers.push(device.macAddress);
                }
                return waterline.nodes.findByIdentifier(newNode.name)
                .then(function(result){
                    if(!result){
                        return waterline.nodes.create(newNode)
                        .then(function (node_) {
                            logger.info('Created Switch Node (ID: ' + node_.id + ')');
                            self.newSwitchNodes.push(node_.id);
                            node_.ip = device.ipAddress;
                            return Promise.all([self.createDefaultObm(node_, device.ipAddress),
                                                self.doPublishDiscovered(node_)])
                            .then(function(){
                                self.checkAllNodesProcessed();
                                if(self.doInventory.indexOf('true') !== -1) {
                                    return self.collectInventory(device, node_);
                                }
                            })
                        })
                    } else {
                        logger.info('Node: ' + newNode.name + ' TYPE: ' + entry.deviceName + ' already exists... Skipping.');
                        self.checkAllNodesProcessed();
                    }
                })
                .catch(function(err){
                    logger.error(err.errorMsg);
                    self.checkAllNodesProcessed();
                })
            })
        })
        return Promise.resolve();
    }


    /**
     * @memberOf DellWsmanDiscoveryJob
     */
    DellWsmanDiscoveryJob.prototype.processChassis = function (deviceList) {
        var self = this;
        if(!deviceList){
            logger.info('No physical chassis found in discovery range.');
            return Promise.resolve();
        }
        deviceList.forEach(function(entry){
            logger.info('Processing Chassis - ' + 'TYPE: ' + entry.deviceName + ' | COUNT: ' + entry.discovered);
            entry.discoveredDeviceInfoList.forEach(function(device){
                if(device.summary === null || device.summary.serviceTag === null){
                    logger.error('No service tag returned for NODE: ' + device.ipAddress + '  Skipping...');
                    self.checkAllNodesProcessed();
                    return;
                }
                var newNode = {
                        name: device.ipAddress,
                        type: 'enclosure',
                        identifiers: [device.summary.serviceTag, device.ipAddress],
                        relations: []
                }
                if(device.macAddress){
                    newNode.identifiers.push(device.macAddress);
                }
                return waterline.nodes.findByIdentifier(newNode.name)
                .then(function(result){
                    if(!result){
                        return waterline.nodes.create(newNode)
                        .then(function (node_) {
                            logger.info('Created Chassis Node (ID: ' + node_.id + ')');
                            self.newChassisNodes.push(node_.id);
                            node_.ip = device.ipAddress;
                            var dmiCatalog = {
                                    'System Information': {
                                        'Manufacturer': device.summary.manufacturer || 'Dell Inc.',
                                        'Product Name': device.summary.model
                                    }
                            }
                            return Promise.all([self.addCatalog(node_, device.summary, 'DeviceSummary'),
                                                self.addCatalog(node_, dmiCatalog, 'dmi'),
                                                self.createWsmanObm(node_, device.ipAddress),
                                                self.doPublishDiscovered(node_)])
                            .then(function(){
                                self.checkAllNodesProcessed();
                                if(self.doInventory.indexOf('true') !== -1) {
                                    return self.collectInventory(device, node_);
                                }
                            })
                        })
                    } else {
                        logger.info('Node: ' + newNode.name + ' TYPE: ' + entry.deviceName + ' already exists... Skipping.');
                        self.checkAllNodesProcessed();
                    }
                })
                .catch(function(err){
                    logger.error(err.errorMsg);
                    self.checkAllNodesProcessed();
                })
            })
        })
        return Promise.resolve();
    }


    /**
     * @memberOf DellWsmanDiscoveryJob
     */
    DellWsmanDiscoveryJob.prototype.processCompute = function (deviceList) {
        var self = this;
        deviceList.forEach(function(entry){
            logger.info('Processing Servers - ' + 'TYPE: ' + entry.deviceName + ' | COUNT: ' + entry.discovered);
            entry.discoveredDeviceInfoList.forEach(function(device){
                if(device.summary === null || device.summary.serviceTag === null){
                    logger.error('No service tag returned for NODE: ' + device.ipAddress + '  Skipping...');
                    self.checkAllNodesProcessed();
                    return;
                }
                var newNode = {
                        name: device.ipAddress,
                        type: 'compute',
                        identifiers: [device.summary.serviceTag, device.ipAddress],
                        relations: []
                }
                if(device.macAddress){
                    newNode.identifiers.push(device.macAddress);
                }
                return waterline.nodes.findByIdentifier(newNode.name)
                .then(function(result){
                    if(!result){
                        return waterline.nodes.create(newNode)
                        .then(function (node_) {
                            logger.info('Created Server Node (ID: ' + node_.id + ')');
                            self.newComputeNodes.push(node_.id);
                            node_.ip = device.ipAddress;
                            var dmiCatalog = {
                                    'System Information': {
                                        'Manufacturer': device.summary.manufacturer || 'Dell Inc.',
                                        'Product Name': device.summary.model
                                    }
                            }
                            return Promise.all([self.createWsmanObm(node_, device.ipAddress),
                                                self.addCatalog(node_, device.summary, 'DeviceSummary'),
                                                self.addCatalog(node_, dmiCatalog, 'dmi'),
                                                self.doPublishDiscovered(node_)])
                            .then(function(){
                                self.createEnclosure(node_, device.ipAddress)
                                .then(function(encNode){
                                    self.checkAllNodesProcessed();
                                    if(self.doInventory.indexOf('true') !== -1) {
                                        return self.collectInventory(device, node_);
                                    }
                                })
                            })
                        })
                    } else {
                        logger.info('Node: ' + newNode.name + ' TYPE: ' + entry.deviceName + ' already exists... Skipping.');
                        self.checkAllNodesProcessed();
                    }
                })
                .catch(function(err){
                    logger.error(err.errorMsg);
                    self.checkAllNodesProcessed();
                })
            })
        })
        return Promise.resolve();
    }


    /**
     * @memberOf DellWsmanDiscoveryJob
     */
    DellWsmanDiscoveryJob.prototype.processDiscoveredDevices = function (result, credential) {
    	var self = this;
    	var discoveredDeviceGroups = new Map();
        result.forEach(function(group){
            group.discoveredDeviceList.forEach(function(devices) {
                if(devices.discovered > 0) {
                    if(group.deviceGroup.indexOf('SERVER') !== -1
                    || group.deviceGroup.indexOf('CHASSIS') !== -1
                    || group.deviceGroup.indexOf('SWITCH') !== -1){
                        self.nodesToProcess += devices.discovered;
                    }
                    discoveredDeviceGroups.set(group.deviceGroup, group.discoveredDeviceList);
                    return;
                }
            });
        });
        logger.debug('NODE COUNT: ' + self.nodesToProcess);
        Promise.resolve(discoveredDeviceGroups)
        .then(function(deviceGroups){
            return self.processChassis(deviceGroups.get('CHASSIS')) // always process chassis first
            .then(function(){
                deviceGroups.forEach(function(data, group){
                    switch(group){
                        case 'SERVER':
                            self.processCompute(data);
                        break;
                        case "CHASSIS":
                        break;
                        case "SWITCH":
                            self.processSwitch(data);
                        break;
                        case "IOM":
                            //self.processIom(data);
                        break;
                        case "STORAGE":
                            //self.processStorage(data);
                        break;
                    }
                })
            })
        })
    };


    DellWsmanDiscoveryJob.prototype.createEnclosure = function(node, ipAddr) {

        var self = this;

        var newNode = {
                name: node.name + '_Enclosure',
                type: 'enclosure',
                identifiers: [node.name + '_Enclosure'],
                relations: []
        }
        logger.info('Generating Enclosure Node for node: ' + node.name, + ' (Type: ' + node.type + ')');
        return waterline.nodes.create(newNode)
        .then(function (node_) {
            self.generatedEnclosureNodes.push(node_.id);
            return self.setRelationships(node, node_)
            .then(function(){
                return Promise.resolve(node_);
            })
        });
    }


    DellWsmanDiscoveryJob.prototype.createDefaultObm = function(node, ipAddr){

    	var self = this;
    	var credential = self.getCredential(ipAddr, self.credentialMapping);

        var settings = {
            service: "noop-obm-service",
            config: {"userName": credential.userName || self.dell.credentials.userName,
                        "password": credential.password || self.dell.credentials.password,
                        "host": ipAddr
            }
        }
        logger.debug('Creating NOOP OBM for node: ' + node.name);
        return waterline.obms.upsertByNode(node.id, settings)
    }


    DellWsmanDiscoveryJob.prototype.createWsmanObm = function(node, ipAddr){

    	var self = this;
    	var credential = self.getCredential(ipAddr, self.credentialMapping);

        var settings = {
            service: "dell-wsman-obm-service",
            config: {"user": credential.userName || self.dell.credentials.userName,
                        "password": credential.password || self.dell.credentials.password,
                        "host": ipAddr
            }
        }
        logger.info('Creating WSMan OBM for node: ' + node.name);
        return waterline.obms.upsertByNode(node.id, settings)
    }


    /**
     * @function createRedfishObm
     */
    DellWsmanDiscoveryJob.prototype.createRedfishObm = function (node, ipAddr, retries) {
        var self = this;
        var redfishType = 'Systems';
        if(node.type === 'enclosure'){
            redfishType = 'Chassis';
        }
    	var credential = self.getCredential(ipAddr, self.credentialMapping);

        logger.info('Creating redfish OBM for node: ' + node.name);

        var uri = 'https://' + ipAddr + '/redfish/v1';

        var settings = {
            uri: uri,
            host: ipAddr,
            root: '/redfish/v1/',
            port: '',
            protocol: 'https',
            username: credential.userName || this.dell.credentials.userName,
            password: credential.password || this.dell.credentials.password,
            verifySSL: true,
            recvTimeoutMs: 15000
        };
        this.redfish.settings = settings;

        var rootPath = settings.root;
        return this.redfish.clientRequest(rootPath)
        .then(function(root) {
            if (!_.has(root.body, redfishType)) {
                logger.warning('No ' + redfishType + ' Members Found');
                return Promise.resolve();
            }
            var path = redfishType === 'Systems' ? root.body.Systems['@odata.id'] : root.body.Chassis['@odata.id'];
            return self.redfish.clientRequest(path)
            .then(function(res) {
                assert.object(res);
                settings.root = res.body.Members[0]['@odata.id'];
                return Promise.resolve({
                    config: settings,
                    service: 'redfish-obm-service'
                })
            })
        })
        .then(function(redfishObm){
            if(redfishObm) {
                logger.info('Persisting redfish OBM to db for node: ' + node.name);
                return waterline.obms.upsertByNode(node.id, redfishObm);
            } else {
                return Promise.resolve();
            }
        })
        .catch(function(err) {
            if(retries){
                logger.info('Failed to create Redfish OBMs. Retrying... ' + node.name);
                return self.createRedfishObm(node, ipAddr, --retries);
            }
            logger.error("Redfish call failed. No OBM settings created for " + node.name);
            return Promise.resolve();
        });
    };


    /**
     * @memberOf DellWsmanPostDiscoveryJob
     */
    DellWsmanDiscoveryJob.prototype.setRelationships = function (n1, n2) {
    	var self = this;
        n1.relations.push({
            relationType: 'enclosedBy',
            targets: [n2.id]
        });
        return waterline.nodes.updateByIdentifier(
            n1.id,
            {relations: n1.relations}
        )
        .then(function(){
            if(_.isEmpty(n2.relations)){
                n2.relations.push({
                    relationType: 'encloses',
                    targets: [n1.id]
                });
            } else {
                var encloses = _.find(n2.relations, { 'relationType': 'encloses' } );
                encloses.targets.push(n1.id);
            }
        })
        .then(function(){
            return waterline.nodes.updateByIdentifier(
                n2.id,
                {relations: n2.relations}
            )
        });
    }



    DellWsmanDiscoveryJob.prototype.setComputeEnclosureToPhysicalChassisRelations = function (nodeId) {
        var self = this;
        var count = 1;

        return waterline.nodes.findByIdentifier(nodeId)
        .then(function(node){
            var target = _.find(node.relations, {'relationType': 'encloses'});
            if(target !== undefined){
                return waterline.nodes.findByIdentifier(target.targets[0])
                .then(function(enclosedNode){
                    return waterline.catalogs.findLatestCatalogOfSource(enclosedNode.id, 'devicesummary')
                    .then(function(catalog){
                        if(catalog.data.systemGeneration !== null){
                            if(catalog.data.systemGeneration.indexOf('Modular') !== -1){
                                return waterline.nodes.findByIdentifier(catalog.data.cmcip)
                                .then(function(chassis){
                                    if(_.isEmpty(chassis) === false){
                                        logger.info('Relating Compute Enclosure ' + node.name + ' to Physical Chassis ' + chassis.name);
                                        // Set up new chassis relations
                                        if(_.isEmpty(chassis.relations)){
                                            chassis.relations.push({
                                                relationType: 'encloses',
                                                targets: [node.id]
                                            });
                                        } else {
                                            var relation = _.find(chassis.relations, {'relationType': 'encloses'});
                                            relation.targets.push(node.id);
                                        }
                                        // Set up new node relations
                                        node.relations.push({
                                            relationType: 'enclosedBy',
                                            targets: [chassis.id]
                                        });
                                        return Promise.all([waterline.nodes.updateOne({id: chassis.id}, {relations: chassis.relations}),
                                                            waterline.nodes.updateOne({id: node.id}, {relations: node.relations})])
                                        .then(function(result){
                                            self.setEnclosures();
                                        })
                                    } else {
                                        logger.warning('Physical chassis for node ' + enclosedNode.name + ' was not found in discovered range.');
                                        self.setEnclosures();
                                    }
                                })
                            } else {
                                self.setEnclosures();
                            }
                        } else {
                            logger.error('System type unknown for node: ' + enclosedNode.name + ' Cannot determine physical chassis relationship.');
                            self.setEnclosures();
                        }
                    })
                })
                .catch(function(err){
                    logger.error(err.errorMsg);
                    self.setEnclosures();
                })
            } else {
                self.setEnclosures();
            }
        })
    }


        DellWsmanDiscoveryJob.prototype.checkAllNodesProcessed = function () {
	        var self = this;
	        logger.info('NODES TO PROCESS: ' + self.nodesToProcess);
            self.nodesToProcess--;
            if(self.nodesToProcess === 0) {
                self.tmpNodeArray = self.generatedEnclosureNodes.slice();
                if(self.tmpNodeArray.length > 0){
                    self.setEnclosures();
                } else {
        	        logger.info('DISCOVERY COMPLETE.');
                    self._done();
                    return;
                }
            }
        }

        DellWsmanDiscoveryJob.prototype.setEnclosures = function () {
	        var self = this;
	        if(self.tmpNodeArray.length === 0){
       	        logger.info('DISCOVERY COMPLETE.');
	            self._done();
	            return;
	        }
	        var nodeId = self.tmpNodeArray.shift();
	        self.setComputeEnclosureToPhysicalChassisRelations(nodeId);
        }


    return DellWsmanDiscoveryJob;
}
