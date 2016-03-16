// Copyright 2016, EMC, Inc.

'use strict';

var di = require('di');

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
    'JobUtils.RedfishTool'
));

function redfishJobFactory(
    BaseJob,
    Logger,
    util,
    assert,
    Promise,
    _,
    waterline,
    RedfishTool
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
     * Collect Redfish Log Service Entries for resource member
     * @param redfish client utility
     * @param resource member to collect entries from
     */
    RedfishJob.prototype.collectLogEntries = function(redfish, resource) {
        return redfish.clientRequest(resource.LogServices['@odata.id'])
        .then(function(res) {
            assert.object(res.body, 'LogServices Collection');
            assert.ok(_.has(res.body, 'Members'));
            return res.body.Members;
        })
        .map(function(member) {
            assert.object(member);
            return redfish.clientRequest(member['@odata.id']);
        })
        .map(function(res) {
            assert.object(res.body, 'LogService Resource');
            assert.ok(_.has(res.body, 'Entries'));
            return redfish.clientRequest(res.body.Entries['@odata.id']);
        })
        .map(function(res) {
            assert.object(res.body, 'Entries Resource');
            assert.ok(_.has(res.body, 'Items'));
            return res.body.Items;
        })
        .then(function(data) {
            data.body = _.flattenDeep(data);
            return data;
        });
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
                return redfish.clientRequest(member.Power['@odata.id']);
            case 'thermal': 
                assert.ok(_.has(member, 'Thermal'),
                    'Thermal Resource for ' + member.Name);
                return redfish.clientRequest(member.Thermal['@odata.id']);
            case 'logservices':
                assert.ok(_.has(member, 'LogServices'), 
                    'LogService for ' + member.Name);
                return self.collectLogEntries(redfish, member);
            default:
                throw new Error(
                    'Unsupported Redfish Command: ' + command
                );
            }
        })
        .then(function(data) {
            assert.object(data);
            data = data.body;
            if (data) {
                return data;
            }
            throw new Error(
                'No Data Found For Command: ' + command
            );
        });
    };

    return RedfishJob;
}
