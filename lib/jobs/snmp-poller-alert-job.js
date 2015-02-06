// Copyright 2014-2015, Renasar Technologies Inc.
/* jshint: node:true */

'use strict';

var di = require('di');

module.exports = snmpPollerAlertJobFactory;
di.annotate(snmpPollerAlertJobFactory, new di.Provide('Job.Poller.Alert.Snmp'));
di.annotate(snmpPollerAlertJobFactory, new di.Inject(
    'Job.Poller.Alert',
    'Logger',
    'Util'
));
function snmpPollerAlertJobFactory(PollerAlertJob, Logger, util) {
    var logger = Logger.initialize(snmpPollerAlertJobFactory);

    /**
     *
     * @param {Object} options
     * @param {Object} context
     * @param {String} taskId
     * @constructor
     */
    function SnmpPollerAlertJob(options, context, taskId) {
        SnmpPollerAlertJob.super_.call(this, logger, options, context, taskId);
    }
    util.inherits(SnmpPollerAlertJob, PollerAlertJob);

    SnmpPollerAlertJob.prototype._determineAlert = function _determineAlert(data) {
        data;
        return undefined;
    };

    return SnmpPollerAlertJob;
}
