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
    'Q'
));
function ipmiSdrPollerAlertJobFactory(PollerAlertJob, Logger, util, assert, Q) {
    var logger = Logger.initialize(ipmiSdrPollerAlertJobFactory);

    /**
     *
     * @param {Object} options
     * @param {Object} context
     * @param {String} taskId
     * @constructor
     */
    function IpmiSdrPollerAlertJob(options, context, taskId) {
        assert.object(options);
        IpmiSdrPollerAlertJob.super_.call(this, logger, options, context, taskId,
                options.ipmiSdrRoutingKey, '_subscribeIpmiSdrCommandResult');
    }
    util.inherits(IpmiSdrPollerAlertJob, PollerAlertJob);

    IpmiSdrPollerAlertJob.prototype._determineAlert = function _determineAlert(data) {
        data;
        return Q.resolve();
    };

    return IpmiSdrPollerAlertJob;
}
