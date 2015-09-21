// Copyright 2015, EMC, Inc.
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
    'Promise',
    '_'
));
function ipmiSdrPollerAlertJobFactory(PollerAlertJob, Logger, util, assert, Promise, _) {
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
        return Promise.resolve()
        .then(function() {
            if (!data) {
                return;
            }
            var alerts = _.transform(data.sdr, function(results, v) {
                if (v.Status !== 'ok' && v.Status !== 'Not Available') {
                    var alertObj = _.omit(data, 'sdr');
                    alertObj.reading = v;
                    results.push(alertObj);
                }
            }, []);
            return _.isEmpty(alerts) ? null : alerts;
        });
    };

    return IpmiSdrPollerAlertJob;
}
