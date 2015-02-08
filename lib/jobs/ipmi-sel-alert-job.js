// Copyright 2014-2015, Renasar Technologies Inc.
/* jshint: node:true */

'use strict';

var di = require('di');

module.exports = ipmiSelPollerAlertJobFactory;
di.annotate(ipmiSelPollerAlertJobFactory, new di.Provide('Job.Poller.Alert.Ipmi.Sel'));
di.annotate(ipmiSelPollerAlertJobFactory, new di.Inject(
    'Job.Poller.Alert',
    'Logger',
    'Util',
    'Assert',
    'Q',
    '_'
));
function ipmiSelPollerAlertJobFactory(PollerAlertJob, Logger, util, assert, Q, _) {
    var logger = Logger.initialize(ipmiSelPollerAlertJobFactory);

    /**
     *
     * @param {Object} options
     * @param {Object} context
     * @param {String} taskId
     * @constructor
     */
    function IpmiSelPollerAlertJob(options, context, taskId) {
        assert.object(context);
        assert.uuid(context.graphId);

        var subscriptionArgs = [context.graphId, 'sel'];

        IpmiSelPollerAlertJob.super_.call(this, logger, options, context, taskId,
                '_subscribeIpmiCommandResult', subscriptionArgs);
    }
    util.inherits(IpmiSelPollerAlertJob, PollerAlertJob);

    IpmiSelPollerAlertJob.prototype._determineAlert = function _determineAlert(data) {
            debugger;
        if (!_.has(data.alerts)) {
            return Q.resolve();
        }
        var alertData = _.omit(data, 'sel');
        alertData.thresholds = {};
        _.forEach(data.sel, function(v, k) {
            debugger;
        });
        if (_.isEmpty(alertData.thresholds)) {
            return Q.resolve();
        }
        return Q.resolve(alertData);
    };

    return IpmiSelPollerAlertJob;
}
