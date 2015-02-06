// Copyright 2014-2015, Renasar Technologies Inc.
/* jshint: node:true */
'use strict';

var di = require('di');

module.exports = runWorkItemsJobFactory;
di.annotate(runWorkItemsJobFactory, new di.Provide('Job.WorkItems.Run'));
di.annotate(runWorkItemsJobFactory, new di.Inject(
    'Job.Base',
    'Protocol.Task',
    'Services.Waterline',
    'Logger',
    'Util',
    'uuid',
    'Q',
    'Assert',
    '_'
));

function runWorkItemsJobFactory(
    BaseJob,
    taskProtocol,
    waterline,
    Logger,
    util,
    uuid,
    Q,
    assert,
    _
) {

    var logger = Logger.initialize(runWorkItemsJobFactory);

    /**
     *
     * @param {Object} [options]
     * @constructor
     */
    function RunWorkItemsJob(options, context, taskId) {
        RunWorkItemsJob.super_.call(this, logger, options, context, taskId);

        _.defaults(this.options, {
            queuePollInterval: 1 * 1000,
            defaultLeaseDuration: 15 * 1000,
        });

        this.workerId = uuid();
        this._running = false;

        this._workItemCallbacks = {
            'Pollers.IPMI': this._executeIpmiPoller.bind(this),
            'Pollers.SNMP': this._executeSnmpPoller.bind(this)
        };
    }

    util.inherits(RunWorkItemsJob, BaseJob);

    /**
     * @memberOf RunWorkItemsJob
     */

    RunWorkItemsJob.prototype._run = function _run() {
        var self = this;
        self.on('done', function () {
            self._running = false;
        });
        self._running = true;

        self._runWorkItems().catch(function (err) {
            if (self._running) {
                self._done(err);
            }
        });
    };

    RunWorkItemsJob.prototype._runWorkItems = function _runWorkItems() {
        var self = this;
        return self._getWorkItem().then(function (workItem) {
            if (!workItem) {
                if (!self._running) {
                    return;
                }
                return Q.delay(self.options.queuePollInterval);
            }
            return self._executeWorkItem(workItem).then(function () {
                return waterline.workitems.setSucceeded(self.workerId, workItem);
            }).catch(function (err) {
                self.logger.error("Work item failed.", {
                    error: err,
                    taskId: self.taskId,
                    workitemId: workItem.id
                });

                return waterline.workitems.setFailed(self.workerId, workItem);
            });
        }).then(function () {
            return self._runWorkItems();
        });
    };

    RunWorkItemsJob.prototype._getWorkItem = function _getWorkItem() {
        var self = this;

        if (!self._running) {
            return Q.resolve();
        }

        return waterline.workitems.startNextScheduled(
            self.workerId,
            {},
            self.options.defaultLeaseDuration
        );
    };

    RunWorkItemsJob.prototype._executeWorkItem = function _executeWorkItem(workItem) {
        var self = this;
        var func = self._workItemCallbacks[workItem.name];
        if (func) {
            return func(workItem);
        }
        return Q.reject('Unknown work item: ' + workItem.name);
    };

    RunWorkItemsJob.prototype._executeIpmiPoller = function _executeIpmiPoller(workItem) {
        var self = this;

        assert.object(workItem.config, 'workItem.config');
        assert.string(workItem.config.command, 'workItem.config.command');

        var obmConfigFound = Q.resolve();
        if (workItem.node) {
            obmConfigFound = waterline.nodes.findOne(workItem.node).then(function (node) {
                var obmSetting = _.find(node.obmSettings, { service: 'ipmi-obm-service' });
                if (obmSetting) {
                    return obmSetting.config;
                }
            });
        }
        return obmConfigFound.then(function (obmSettings) {
            var data = _.assign({},
                                obmSettings,
                                _.omit(workItem.config, 'command'),
                                { workItemId: workItem.id });
            return taskProtocol.publishRunIpmiCommand(
                self.context.graphId,
                workItem.config.command,
                data);
        });
    };

    RunWorkItemsJob.prototype._executeSnmpPoller = function _executeSnmpPoller(workItem) {
        assert.object(workItem.config, 'workItem.config');

        var config = _.assign({}, workItem.config, {
            workItemId: workItem.id
        });

        return taskProtocol.publishRunSnmpCommand(
            this.context.graphId,
            config
        );
    };

    return RunWorkItemsJob;
}
