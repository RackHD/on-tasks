// Copyright 2015, EMC, Inc.
/* jshint: node:true */
'use strict';

var di = require('di');

module.exports = cleanWorkItemsJobFactory;
di.annotate(cleanWorkItemsJobFactory, new di.Provide('Job.WorkItems.Clean'));
di.annotate(cleanWorkItemsJobFactory, new di.Inject(
    'Job.Base',
    'Services.Waterline',
    'Logger',
    'Util',
    'uuid',
    'Promise',
    'Assert',
    '_'
));

function cleanWorkItemsJobFactory(BaseJob, waterline, Logger, util, uuid, Promise, assert, _) {

    var logger = Logger.initialize(cleanWorkItemsJobFactory);

    /**
     *
     * @param {Object} [options]
     * @constructor
     */
    function CleanWorkItemsJob(options, context, taskId) {
        CleanWorkItemsJob.super_.call(this, logger, options, context, taskId);

        this.routingKey = this.context.graphId;
        assert.uuid(this.routingKey) ;

        _.defaults(this.options, {
            queuePollInterval: 10 * 1000,
            leaseAdjust: 0
        });

        this._running = false;
    }

    util.inherits(CleanWorkItemsJob, BaseJob);

    /**
     * @memberOf CleanWorkItemsJob
     */

    CleanWorkItemsJob.prototype._run = function _run() {
        var self = this;
        self._runClean().catch(function (err) {
            if (self.isPending()) {
                self._done(err);
            }
        });
    };

    CleanWorkItemsJob.prototype._runClean = function _runClean() {
        var self = this;
        if (!self.isPending()) {
            return Promise.resolve();
        }
        var expiry = new Date(Date.now() - self.options.leaseAdjust);
        return waterline.workitems.findExpired(expiry).then(function (workItems) {
            return waterline.workitems.setFailed(null, workItems);
        }).then(function () {
            return Promise.delay(self.options.queuePollInterval);
        }).then(function () {
            return self._runClean();
        });
    };

    return CleanWorkItemsJob;
}

