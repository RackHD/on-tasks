// Copyright 2016, EMC, Inc.
'use strict';

var di = require('di');

module.exports = waitNotificationJobFactory;
di.annotate(waitNotificationJobFactory, new di.Provide('Job.Wait.Notification'));
    di.annotate(waitNotificationJobFactory,
    new di.Inject(
        'Job.Base',
        'Logger',
        'Assert',
        'Util',
        'Promise'
    )
);

function waitNotificationJobFactory(
    BaseJob,
    Logger,
    assert,
    util,
    Promise
) {
    var logger = Logger.initialize(waitNotificationJobFactory);

    /**
     *
     * @param {Object} options
     * @param {Object} context
     * @param {String} taskId
     * @constructor
     */
    function WaitNotificationJob(options, context, taskId) {
        var self = this;
        WaitNotificationJob.super_.call(self, logger, options, context, taskId);
        self.nodeId = self.context.target;
    }
    util.inherits(WaitNotificationJob, BaseJob);

    /**
     * @memberOf WaitNotificationJob
     */
    WaitNotificationJob.prototype._run = function() {
        var self = this;
        return Promise.resolve().then(function() {
            self._subscribeRequestProperties(function() {
                return self.options;
            });

            self._subscribeNodeNotification(self.nodeId, function(data) {
                assert.object(data);
                self._done();
            });
        }).catch(function(err) {
            logger.error('Fail to run wait for notification', {
                node: self.nodeId,
                error: err,
                options: self.options
            });
            self._done(err);
        });
    };

    return WaitNotificationJob;
}
