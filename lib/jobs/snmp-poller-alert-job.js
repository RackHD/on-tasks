// Copyright 2014-2015, Renasar Technologies Inc.
/* jshint: node:true */

'use strict';

var di = require('di');

module.exports = snmpPollerAlertJobFactory;
di.annotate(snmpPollerAlertJobFactory, new di.Provide('Job.Poller.Alert.Snmp'));
di.annotate(snmpPollerAlertJobFactory, new di.Inject(
    'Job.Poller.Alert',
    'Logger',
    'Util',
    'Assert',
    'Q'
));
function snmpPollerAlertJobFactory(PollerAlertJob, Logger, util, assert, Q) {
    var logger = Logger.initialize(snmpPollerAlertJobFactory);

    /**
     *
     * @param {Object} options
     * @param {Object} context
     * @param {String} taskId
     * @constructor
     */
    function SnmpPollerAlertJob(options, context, taskId) {
        assert.object(options);
        SnmpPollerAlertJob.super_.call(this, logger, options, context, taskId,
                options.snmpRoutingKey, '_subscribeSnmpCommandResult');
    }
    util.inherits(SnmpPollerAlertJob, PollerAlertJob);

    SnmpPollerAlertJob.prototype._determineAlert = function _determineAlert(data) {
        data;
        return Q.resolve();
    };

    return SnmpPollerAlertJob;
}
