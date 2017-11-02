// Copyright 2017 Dell Inc. or its subsidiaries. All Rights Reserved.

'use strict';

var di = require('di');

module.exports = ucsJobFactory;
di.annotate(ucsJobFactory, new di.Provide('Job.Ucs'));
di.annotate(ucsJobFactory, new di.Inject(
    'Job.Ucs.Base',
    'Logger',
    'Util',
    'Promise',
    'Services.Waterline',
    'Services.Configuration',
    'Services.Encryption',
    '_',
    'Assert'
));

function ucsJobFactory(
    UcsBaseJob,
    Logger,
    util,
    Promise,
    waterline,
    configuration,
    encryption,
    _,
    assert
) {
    var logger = Logger.initialize(ucsJobFactory);

    /**
     *
     * @param {Object} options
     * @param {Object} context
     * @param {String} taskId
     * @constructor
     */
    function UcsJob(options, context, taskId) {
        UcsJob.super_.call(this, logger, options, context, taskId);
        this.routingKey = context.graphId;
        assert.uuid(this.routingKey);

        this.concurrent = {};
        this.maxConcurrent = 10;
        this.ucsComandClassIds = {
            "ucs.powerthermal": "memoryUnitEnvStats,processorEnvStats," +
                "computeMbPowerStats,computeMbTempStats,equipmentChassisStats",
            "ucs.fan": "equipmentFanStats",
            "ucs.psu": "equipmentPsuStats",
            "ucs.disk": "storageLocalDiskSlotEp",
            "ucs.led": "equipmentLed",
            "ucs.sel": "sysdebugMEpLog"
        };
    }

    util.inherits(UcsJob, UcsBaseJob);

    /**
     * @function _run
     * @description the jobs internal run method
     **/
    UcsJob.prototype._run = function() {
        var self = this;

        return waterline.workitems.update({
                name: "Pollers.UCS"
            }, {
                failureCount: 0
            })
            .then(function() {
                return self._subscribeRunUcsCommand(
                    self.routingKey,
                    self._subscribeUcsCallback.bind(self)
                );
            })
            .catch(function(error) {
                logger.error("error occured " + error);
            });
    };

    UcsJob.prototype._subscribeUcsCallback = function(data) {
        var self = this;
        return new Promise(function(reslove, reject) {
                if (self.concurrentRequests(data.node, data.workItemId)) {
                    return reject(new Error("max number of request has been reached."));
                } else {
                    self.addConcurrentRequest(data.node, data.workItemId);
                    return reslove();
                }
            })
            .then(function() {
                return waterline.obms.findByNode(data.node, 'ucs-obm-service', true)
                    .then(function(obmSetting) {
                        if (obmSetting) {
                            return {
                                obmSetting: obmSetting,
                                command: data.config.command,
                                data: data
                            };
                        } else {
                            return Promise.reject(
                                new Error("No ucs-obm-service found for id: %s".format(data.node)));
                        }
                    });
            })
            .then(function(entity) {
                return self._collectUcsPollerData(entity);
            })
            .then(function(result) {
                data.result = result;
                return self._publishUcsCommandResult(
                    self.routingKey,
                    data.config.command,
                    data
                );
            })
            .then(function() {
                return waterline.workitems.findOne({
                    id: data.workItemId
                });
            })
            .then(function(workitem) {
                return waterline.workitems.setSucceeded(null, null, workitem);
            })
            .catch(function(error) {
                logger.error('Error occured ' + error);
            })
            .finally(function() {
                self.removeConcurrentRequest(data.node, data.workItemId);
            });
    };

    /**
     * @function _collectUcsPollerData
     * @description collect ucs poller data 
     */
    UcsJob.prototype._collectUcsPollerData = function(entity) {
        var self = this;
        return Promise.try(function() {
            var classIds = self.ucsComandClassIds[entity.command];
            if (!classIds) {
                return Promise.reject(
                    new Error('No ucs classIds found for command %s'.format(entity.command))
                );
            }
            var url = "/pollers/async?identifier=%s&classIds=%s&taskId=%s"
                .format(entity.obmSetting.config.dn, classIds, self.taskId);
            var settings = _.cloneDeep(entity.obmSetting.config);
            settings.ucsPassword = encryption.decrypt(settings.ucsPassword);
            return self._ucsRequestAsync(url, settings, self.taskId)
                .then(function(res) {
                    return res.body;
                });
        });
    };

    /**
     * @function concurrentRequests
     * @description manage concurrent work item command requests
     */
    UcsJob.prototype.concurrentRequests = function(node, type) {
        var self = this;
        self.concurrent[node] = self.concurrent[node] || {};
        self.concurrent[node][type] = self.concurrent[node][type] || 0;
        if (self.concurrent[node][type] >= self.maxConcurrent) {
            return true;
        } else {
            return false;
        }
    };

    /**
     * @function addConcurrentRequest
     * @description add a new command request for this work item
     */
    UcsJob.prototype.addConcurrentRequest = function(node, type) {
        var self = this;
        self.concurrent[node][type] += 1;
    };

    /**
     * @function removeConcurrentRequest
     * @description remove a completed command request for this work item
     */
    UcsJob.prototype.removeConcurrentRequest = function(node, type) {
        var self = this;
        self.concurrent[node][type] -= 1;
    };

    return UcsJob;
}
