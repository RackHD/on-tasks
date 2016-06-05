// Copyright 2016, EMC, Inc.

'use strict';

var di = require('di'),
    urlParse = require('url-parse');

module.exports = redfishJobFactory;
di.annotate(redfishJobFactory, new di.Provide('Job.Redfish'));
di.annotate(redfishJobFactory, new di.Inject(
    'Job.Base',
    'Logger',
    'Util',
    'Assert',
    'Promise',
    '_',
    'Services.Waterline',
    'JobUtils.RedfishTool',
    'Constants'
));

function redfishJobFactory(
    BaseJob,
    Logger,
    util,
    assert,
    Promise,
    _,
    waterline,
    RedfishTool,
    Constants
) {
    var logger = Logger.initialize(redfishJobFactory);

    /**
     *
     * @param {Object} options
     * @param {Object} context
     * @param {String} taskId
     * @constructor
     */
    function RedfishJob(options, context, taskId) {
        RedfishJob.super_.call(this, logger, options, context, taskId);
        
        this.routingKey = this.context.graphId;
        assert.uuid(this.routingKey) ;

        this.concurrent = {};
        this.maxConcurrent = 1;
    }
    util.inherits(RedfishJob, BaseJob);
    
    RedfishJob.prototype.initClient = function(settings) {
        var redfish = new RedfishTool();
        redfish.settings = settings;
        return redfish;
    };
    
    /**
     * @function _run
     * @description the jobs internal run method
     */
    RedfishJob.prototype._run = function run() {
        var self = this;
        return waterline.workitems.update({name: "Pollers.Redfish"}, {failureCount: 0})
        .then(function() {
            self._subscribeRedfishCommand(self.routingKey, function(data) {
                if (self.concurrentRequests(data.node, data.workItemId)) {
                    return;
                }
                self.addConcurrentRequest(data.node, data.workItemId);
                assert.object(data.config, 
                    'Redfish Poller Data Config');

                return waterline.nodes.needByIdentifier(data.node)
                .then(function(node) {
                    var obmSetting = _.find(node.obmSettings, { service: 'redfish-obm-service' });
                    if (obmSetting) {
                        return [  
                            obmSetting.config, 
                            data.config.command 
                        ];
                    }
                })
                .spread(function(config, command) {
                    return self.collectData(
                        config,
                        command
                    );
                })
                .then(function(result) {
                    assert.object(result,
                        'Expected Result Object For: ' + data.config.command
                    );
                    data[data.config.command] = result;

                    return self._publishRedfishCommandResult(
                        self.routingKey, 
                        data.config.command, 
                        data
                    );
                })
                .then(function() {
                    return waterline.workitems.findOne({ id: data.workItemId });
                })
                .then(function(workitem) {
                        return waterline.workitems.setSucceeded(null, workitem);
                })
                .catch(function (err) {
                    logger.error("Error Retrieving Redfish Data.", {
                        data: data,
                        error: err
                    });
                })
                .finally(function() {
                    self.removeConcurrentRequest(data.node, data.workItemId);
                });
            });
        })
        .catch(function(err) {
            logger.error("Failed to initialize job", { 
                error:err
            });
            self._done(err);
        });
    };

    /**
     * @function concurrentRequests
     * @description manage concurrent work item command requests
     */
    RedfishJob.prototype.concurrentRequests = function(node, workItemId) {
        assert.string(node);
        assert.string(workItemId);
        if(!_.has(this.concurrent, node)){
            this.concurrent[node] = {};
        }
        if(!_.has(this.concurrent[node], workItemId)){
            this.concurrent[node][workItemId] = 0;
        }
        if(this.concurrent[node][workItemId] >= this.maxConcurrent){
            return true;
        } else {
            return false;
        }
    };

    /**
     * @function addConcurrentRequest
     * @description add a new command request for this work item
     */
    RedfishJob.prototype.addConcurrentRequest = function(node, type) {
        assert.object(this.concurrent[node]);
        assert.number(this.concurrent[node][type]);
        this.concurrent[node][type] += 1;
    };

    /**
     * @function removeConcurrentRequest
     * @description remove a completed command request for this work item
     */
     RedfishJob.prototype.removeConcurrentRequest = function(node, type) {
        assert.object(this.concurrent[node]);
        assert.number(this.concurrent[node][type]);
        this.concurrent[node][type] -= 1;
    };
    
    /**
     * Collect Redfish Log Service Entries for Systems resource member
     * @param redfish client utility
     * @param system resource path to collect entries from
     */
    RedfishJob.prototype.collectSystemLogEntries = function(redfish, resource) {
        return redfish.clientRequest(resource)
        .then(function(res) {
            assert.ok(_.has(res.body, 'Members'), 
                'Has LogServices Members');
            return res.body.Members;
        })
        .map(function(member) {
            assert.object(member, 'LogService Member');
            return redfish.clientRequest(member['@odata.id']);
        })
        .map(function(res) {
            assert.ok(_.has(res.body, 'Entries'),
                'Has LogService Entries');
            return redfish.clientRequest(res.body.Entries['@odata.id']);
        })
        .map(function(res) {
            assert.ok(_.has(res.body, 'Members'), 
                'Has Entry Members');
            return res.body.Members;
        })
        .map(function(memberArr) {
            var promises = [];
            _.forEach(memberArr, function(member) {
                promises.push(redfish.clientRequest(member['@odata.id']));
            });
            return Promise.all(promises);
        })
        .map(function(resArr) {
            var data = [];
            _.forEach(resArr, function(res) {
                data.push(res.body); 
            });
            return data;
        });
    };
    
    /**
     * Collect Redfish Log Service Entries for Managers resource member
     * @param redfish client utility
     */
    RedfishJob.prototype.collectManagersLogEntries = function(redfish) {
        var parse = urlParse(redfish.settings.uri);
        var rootPath = parse.pathname + '/';
        
        // Managers is a root resource
        return redfish.clientRequest(rootPath)
        .then(function(res) {
            assert.ok(_.has(res.body, 'Managers'),
                'Managers Resource');
            return redfish.clientRequest(res.body.Managers['@odata.id']);
        })
        .then(function(res) {
            assert.ok(_.has(res.body, 'Members'), 
                'Has Manager Members');
            return res.body.Members;
        })
        .map(function(member) {
            assert.object(member, 'Manager Member');
            return redfish.clientRequest(member['@odata.id']);
        })
        .map(function(res) {
            assert.ok(_.has(res.body, 'LogServices'), 
                'Has LogServices Resource');
            return redfish.clientRequest(res.body.LogServices['@odata.id']);
        })
        .map(function(res) {
            assert.ok(_.has(res.body, 'Members'), 
                'Has LogService Members');
            return res.body.Members;           
        })
        .map(function(member) {
            assert.object(member, 'Log Service Member');
            return redfish.clientRequest(member[0]['@odata.id']);
        })
        .map(function(res) {
            assert.ok(_.has(res.body, 'Entries'), 
                'Has LogServices Entries');
            return redfish.clientRequest(res.body.Entries['@odata.id']);
        })
        .map(function(res) {
            assert.ok(_.has(res.body, 'Members'), 
                'Has Entry Members');
            return res.body.Members;
        })
        .map(function(memberArr) {
            var promises = [];
            _.forEach(memberArr, function(member) {
                promises.push(redfish.clientRequest(member['@odata.id']));
            });
            return Promise.all(promises);
        })
        .map(function(resArr) {
            var data = [];
            _.forEach(resArr, function(res) {
                data.push(res.body); 
            });
            return data;
        });
    };

    /**
     * Check fabric service status and generate alert on status change
     * @param redfish client utility
     */
    RedfishJob.prototype.fabricServiceDataAlert = function(redfish, currentData) {
        var self = this;
        var alert = {
            pollerName: 'FabricService',
            data: []
        };
        var eventTypes = Constants.Redfish.EventTypes;
        return Promise.resolve()
        .then(function() {
            if(self.fabricDataCache) {
                assert.ok(_.has(self.fabricDataCache, 'EndPoints'), 
                    'Last Endpoint Data'
                );
                assert.ok(_.has(currentData, 'EndPoints'), 
                    'Current Endpoint Data'
                );
                var currentEndpoints = currentData.EndPoints;
                var lastEndpoints = self.fabricDataCache.EndPoints;
                if(JSON.stringify(currentEndpoints) !== JSON.stringify(lastEndpoints)) {
                    _.forEach(currentEndpoints, function(endpoint) {
                        var match = _.find(lastEndpoints, 
                                    _.matches({EndPointName:endpoint.EndPointName}));         
                        if(_.isUndefined(match)) {
                            alert.data.push(endpoint);
                            alert.EventType = eventTypes.ResourceAdded;
                        } else {
                            if(match.Available !== endpoint.Available) {
                                alert.data.push(endpoint);
                                alert.EventType = eventTypes.ResourceUpdated;
                            }  
                        }
                    });
                    
                    _.forEach(lastEndpoints, function(endpoint) {
                        var match = _.find(currentEndpoints, 
                                    _.matches({EndPointName:endpoint.EndPointName}));
                        if(_.isUndefined(match)) {
                            alert.data.push(endpoint);
                            alert.EventType = eventTypes.ResourceRemoved;
                        }
                    });
                }
                if(alert.data.length) {
                    logger.debug('FabricService Status Alert', {alert:alert});
                    return self._publishPollerAlert(self.routingKey, 'fabricservice', alert);
                }
                return;
            }
        })
        .then(function() {
            self.fabricDataCache = currentData;    
            return currentData;        
        });
    };
    
    /**
     * Collect Emc OEM Redfish FabricService resource data
     * @param redfish client utility
     */
    RedfishJob.prototype.collectFabricServiceData = function(redfish) {
        var self = this;
        var parse = urlParse(redfish.settings.uri);
        var rootPath = parse.pathname + '/';

        // FabricService is a root Oem resource
        return redfish.clientRequest(rootPath)
        .then(function(res) {
            assert.ok(_.has(res.body, 'Oem.Emc.FabricService'),
                'Has FabricService Resource');
            return redfish.clientRequest(
                res.body.Oem.Emc.FabricService['@odata.id']
            );
        })
        .then(function(res) {
            return self.fabricServiceDataAlert(redfish, res.body);
        });
    };

    /**
     * Collect Emc OEM Redfish Elements Thermal resource data
     * @param redfish client utility
     */
    RedfishJob.prototype.collectOemElementsThermalData = function(redfish) {
        var self = this;
        var parse = urlParse(redfish.settings.root);
        return redfish.clientRequest(parse)
        .then(function (res) {
            assert.ok(_.has(res.body, 'Oem.Emc.Elements'),
                  'Has Oem Elements Resource');
            var elements = _.get(res.body, 'Oem.Emc.Elements');
            return elements['@odata.id'];
        })
        .then(function (id) {
            assert.string(id, 'Element Identifier');
            return redfish.clientRequest(id);
        })
        .then(function (res) {
            assert.object(res, 'Element Resource Object');
            var elements = _.get(res, 'body.Members');
            return elements;
        })
        .map(function (element) {
            return redfish.clientRequest(element['@odata.id']);
        })
        .map(function (element) {
            assert.object(element.body);
            return element.body;
        })
        .map(function (element) {
            return redfish.clientRequest(element['@odata.id'])
                .then(function (element) {
                    return element;
                });
        })
        .map(function (element) {
            assert.ok(_.has(element.body, 'Thermal'),
                'Has Thermal Resource');
            return redfish.clientRequest(
                element.body.Thermal['@odata.id']
                )
                .then(function(res) {
                    return(res.body);
                });
        })
    };
    
    /**
     * Collect Redfish telemetry data for specified Redfish command
     * @param config the redfish configuration settings object
     * @param command the redfish command 
     */
    RedfishJob.prototype.collectData = function(config, command) {
        var self = this;
        assert.string(command, 'Redfish Command');
        var redfish = self.initClient(config);
        
        return redfish.clientRequest(config.root)
        .then(function(response) {
            return response.body;
        })
        .then(function(member) {
            switch(command) {
            case 'power':
                assert.ok(_.has(member, 'Power'), 
                    'Power Resource for ' + member.Name);
                return redfish.clientRequest(
                    member.Power['@odata.id']
                );
            case 'thermal': 
                assert.ok(_.has(member, 'Thermal'),
                    'Thermal Resource for ' + member.Name);
                return redfish.clientRequest(
                    member.Thermal['@odata.id']
                );
            case 'systems.logservices':
                assert.ok(_.has(member, 'LogServices'), 
                    'LogService for ' + member.Name);
                return self.collectSystemLogEntries(
                    redfish, member.LogServices['@odata.id']
                );
            case 'managers.logservices':
                return self.collectManagersLogEntries(
                    redfish // starts at root
                );
            case 'fabricservice':
                return self.collectFabricServiceData(
                    redfish // starts at root
                );
            case 'elements.thermal':
                return self.collectOemElementsThermalData(
                    redfish
                );
            default:
                throw new Error(
                    'Unsupported Redfish Command: ' + command
                );
            }
        })
        .then(function(data) {
            if (!data) {
                throw new Error(
                    'No Data Found For Command: ' + command
                );
            }
            if (data.body) {
                data = data.body;
            }
            return data;
        });
    };
    return RedfishJob;
}
