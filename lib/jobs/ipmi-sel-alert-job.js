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
        if (!_.has(data, 'alerts')) {
            return Q.resolve();
        }
        var alertData = _.omit(data, 'sel');
        alertData.alerts = _.transform(data.sel, function(result, v, k) {
            var doesMatch = true;
            _.forEach(data.alerts, function(alertValue, alertKey) {
                if (alertValue[0] === '/' && _.last(alertValue) === '/') {
                    var regexString = alertValue.slice(1, alertValue.length-1);
                    var regex = new RegExp(regexString);
                    if (regex.test(v[alertKey])) {
                        return;
                    } else {
                        doesMatch = false;
                    }
                } else if (alertValue === v[alertKey]){
                    return;
                } else {
                    doesMatch = false;
                }
            });
            if (doesMatch) {
                result[k] = v;
            }
        }, {});
        if (_.isEmpty(alertData.alerts)) {
            return Q.resolve();
        }
        return Q.resolve(alertData);
    };

    return IpmiSelPollerAlertJob;
}
