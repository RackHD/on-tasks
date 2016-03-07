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
    redfishTool
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
                        return obmSetting.config;
                    }
                })
                .then(function(settings) {
                    return redfishTool.clientInit(settings);
                })
                .then(function(client) {
                    return self.collectChassisData(
                        client, 
                        data.config.command
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
                    redfishTool.clientDone();
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
     * Collect Chassis telemetry data for Redfish Chassis
     * @param client the redfish API client object
     */
    RedfishJob.prototype.collectChassisData = function(redfishApi, command) {
        assert.object(redfishApi, 'Redfish API client');
        assert.string(command, 'Chassis Command');
        
        return redfishApi.listChassisAsync()
        .then(function(res) {
            assert.object(res);
            return res[1].body.Members;
        })
        .map(function(member) {
            var id = member['@odata.id']
                .split('Chassis/')[1].split(/\/+$/)[0]; // trim slash
            assert.string(id, 'Expected Chassis Id String');
            switch(command) {
            case 'power': 
                return redfishApi.getPowerAsync(id);
            case 'thermal': 
                return redfishApi.getThermalAsync(id);
            default:
                throw new Error(
                    'Unsupported Chassis Command: ' + command
                );
            }
        })
        .map(function(data) {
            assert.ok(Array.isArray(data));
            data = data[1].body;
            if (data) {
                return data;
            }
            throw new Error(
                'No Data Found For Command: ' + command
            );
        })
        .catch(function(err) {
            // handle redfishApi rest error
            if (_.has(err, 'response.text')) { 
                throw new Error(err.response.text);
            }
            throw err;
        });
    };

    return RedfishJob;
}
