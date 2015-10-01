// Copyright 2015, EMC, Inc.
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
    'Promise',
    '_'
));
function ipmiSelPollerAlertJobFactory(PollerAlertJob, Logger, util, assert, Promise, _) {
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
        // Set the pollerName var
        data.pollerName = "sel";
        if (!_.has(data, 'alerts')) {
            return Promise.resolve();
        }
        // Only get the most recent value to alert on, e.g. if power unit 2
        // became non-redundant, and then fully redundant again, we don't want
        // to alert that because a good state has been restored.
        var latestValuesPerSensor = _.transform(data.sel, function(result, entry) {
            result[entry.sensor+'::'+entry.event] = entry;
        }, {});
        var alertData = _.omit(data, 'sel');
        alertData.alerts = _.compact(_.map(latestValuesPerSensor, function(v) {
            var doesMatch = true;
            var matches = _.compact(_.map(data.alerts, function(alertItem) {
                _.forEach(alertItem, function(alertValue, alertKey) {
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
                    return alertItem;
                }
            }));
            if (!_.isEmpty(matches))  {
                return {
                    data: v,
                    matches: matches
                };
            }
        }));
        if (_.isEmpty(alertData.alerts)) {
            return Promise.resolve();
        }
        return Promise.resolve(alertData);
    };

    return IpmiSelPollerAlertJob;
}
