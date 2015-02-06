// Copyright 2014-2015, Renasar Technologies Inc.
/* jshint: node:true */

'use strict';

var di = require('di');

module.exports = pollerAlertJobFactory;
di.annotate(pollerAlertJobFactory, new di.Provide('Job.Poller.Alert'));
di.annotate(pollerAlertJobFactory, new di.Inject(
    'Job.Base',
    'Logger',
    'Util',
    'Assert'
));
function pollerAlertJobFactory(BaseJob, Logger, util, assert) {
    var logger = Logger.initialize(pollerAlertJobFactory);

    /**
     *
     * @param {Object} options
     * @param {Object} context
     * @param {String} taskId
     * @constructor
     */
    function PollerAlertJob(logger, options, context, taskId, routingKey, subscriptionMethodName) {
        PollerAlertJob.super_.call(this, logger, options, context, taskId);

        assert.uuid(routingKey) ;
        // Polymorphic
        assert.func(this._determineAlert);
        assert.string(subscriptionMethodName);
        assert.func(this[subscriptionMethodName]);

        this.subscriptionMethod = this[subscriptionMethodName];
        this.routingKey = routingKey;
    }
    util.inherits(PollerAlertJob, BaseJob);

    /**
     * @memberOf PollerAlertJob
     */
    PollerAlertJob.prototype._run = function run() {
        // NOTE: this job will run indefinitely absent user intervention
        var self = this;

        self.subscriptionMethod(self.routingKey, function(data) {
            return self._determineAlert(data)
            .then(function(alertData) {
                if (alertData) {
                    return self._publishPollerAlert(alertData);
                }
            })
            .catch(function(error) {
                logger.error("Error processing/publishing alert data.", {
                    error: error,
                    taskId: self.taskId
                });
            });
        });
    };

    return PollerAlertJob;
}
