// Copyright 2015, EMC, Inc.

'use strict';

var di = require('di');

module.exports = pollerAlertJobFactory;
di.annotate(pollerAlertJobFactory, new di.Provide('Job.Poller.Alert'));
di.annotate(pollerAlertJobFactory, new di.Inject(
    'Job.Base',
    'Logger',
    'Util',
    'Assert',
    'Promise'
));
function pollerAlertJobFactory(BaseJob, Logger, util, assert, Promise) {
    /**
     *
     * @param {Object} logger
     * @param {Object} options
     * @param {Object} context
     * @param {String} taskId
     * @param {String} subscriptionMethodName
     * @param {[String]} subscriptionArgs
     * @constructor
     */
    function PollerAlertJob(logger, options, context, taskId,
            subscriptionMethodName, subscriptionArgs) {

        PollerAlertJob.super_.call(this, logger, options, context, taskId);

        this.logger = logger;
        assert.uuid(context.graphId) ;
        // Polymorphic
        assert.func(this._determineAlert);
        assert.string(subscriptionMethodName);
        assert.arrayOfString(subscriptionArgs);
        assert.func(this[subscriptionMethodName]);

        this.subscriptionArgs = subscriptionArgs;
        this.subscriptionMethod = this[subscriptionMethodName];
        this.routingKey = context.graphId;
    }
    util.inherits(PollerAlertJob, BaseJob);

    /**
     * @memberOf PollerAlertJob
     */
    PollerAlertJob.prototype._run = function run() {
        // NOTE: this job will run indefinitely absent user intervention
        var self = this;
        self.subscriptionArgs.push(function(data) {
            return self._determineAlert(data)
            .then(function(alert) {
                if(alert) {
                    assert.array(alert);
                    return Promise.map(alert, function(item) {
                        return self._publishPollerAlert(item);
                    });
                }
            })
            .catch(function(error) {
                self.logger.error("Error processing/publishing alert data.", {
                    error: error,
                    taskId: self.taskId
                });
            });
        });

        self.subscriptionMethod.apply(self, self.subscriptionArgs);
    };

    return PollerAlertJob;
}
