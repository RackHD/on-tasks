// Copyright 2014-2015, Renasar Technologies Inc.
/* jshint: node:true */

'use strict';

var di = require('di');

module.exports = ipmiSdrPollerAlertJobFactory;
di.annotate(ipmiSdrPollerAlertJobFactory, new di.Provide('Job.Poller.Alert.Ipmi.Sdr'));
di.annotate(ipmiSdrPollerAlertJobFactory, new di.Inject(
    'Job.Poller.Alert',
    'Logger',
    'Util',
    'Assert',
    'Q',
    '_'
));
function ipmiSdrPollerAlertJobFactory(PollerAlertJob, Logger, util, assert, Q, _) {
    var logger = Logger.initialize(ipmiSdrPollerAlertJobFactory);

    /**
     *
     * @param {Object} options
     * @param {Object} context
     * @param {String} taskId
     * @constructor
     */
    function IpmiSdrPollerAlertJob(options, context, taskId) {
        assert.object(context);
        assert.uuid(context.graphId);

        var subscriptionArgs = [context.graphId, 'sdr'];

        IpmiSdrPollerAlertJob.super_.call(this, logger, options, context, taskId,
                '_subscribeIpmiCommandResult', subscriptionArgs);
    }
    util.inherits(IpmiSdrPollerAlertJob, PollerAlertJob);

    IpmiSdrPollerAlertJob.prototype._determineAlert = function _determineAlert(data) {
        var alertData = _.omit(data, 'sdr');
        alertData.thresholds = {};
        _.forEach(data.sdr, function(v, k) {
            if (v.type === 'threshold' && v.value !== 'ok') {
                alertData.thresholds[k] = v;
            }
        });
        if (_.isEmpty(alertData.thresholds)) {
            return Q.resolve();
        }
        return Q.resolve(alertData);
    };

    return IpmiSdrPollerAlertJob;
}
