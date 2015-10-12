// Copyright 2015, EMC, Inc.
/* jshint: node:true */

'use strict';

var di = require('di');

module.exports = snmpPollerAlertJobFactory;
di.annotate(snmpPollerAlertJobFactory, new di.Provide('Job.Poller.Alert.Snmp'));
di.annotate(snmpPollerAlertJobFactory, new di.Inject(
    'Job.Poller.Alert',
    'JobUtils.Snmptool',
    'Logger',
    'Util',
    'Assert',
    'Promise',
    'Services.Waterline',
    '_'
));
function snmpPollerAlertJobFactory(
    PollerAlertJob,
    Snmptool,
    Logger,
    util,
    assert,
    Promise,
    waterline,
    _
) {
    var logger = Logger.initialize(snmpPollerAlertJobFactory);

    /**
     *
     * @param {Object} options
     * @param {Object} context
     * @param {String} taskId
     * @constructor
     */
    function SnmpPollerAlertJob(options, context, taskId) {
        assert.object(context);
        assert.uuid(context.graphId);

        var subscriptionArgs = [context.graphId];

        SnmpPollerAlertJob.super_.call(this, logger, options, context, taskId,
                '_subscribeSnmpCommandResult', subscriptionArgs);
    }
    util.inherits(SnmpPollerAlertJob, PollerAlertJob);

    function doesMatch(stringOrRegex, inString) {
        try {
            return stringOrRegex.test(inString);
        } catch (err) {
            return (stringOrRegex === inString);
        }
    }

    SnmpPollerAlertJob.prototype._determineAlert = function _determineAlert(data) {
        if (!data.config.alerts) {
            return Promise.resolve();
        }
        var conf = _.cloneDeep(data.config);
        conf.alerts = [];
        var alerts = _.map(data.config.alerts, function(alertItem) {
            return _.transform(alertItem, function(result, alertVal, alertKey) {
                //turn the string representations of regexps into regex objects
                if (alertVal[0] === '/' && _.last(alertVal) === '/') {
                    var regexString = alertVal.slice(1, alertVal.length-1);
                    var regex = new RegExp(regexString);
                    result[alertKey] = regex;
                } else {
                    result[alertKey] = alertVal;
                }
            });
        });

        var pollResults =  _.transform(data.result, function(result, pollItem) {
            _.forEach(pollItem.values, function(oidVal, oidKey) {
                result[oidKey] = oidVal;
            });
        }, {});

        var alertMatches = _.transform(alerts, function(result, alertItem) {
            var alertingValues = {};
            var matched = _.every(alertItem, function(alertVal, alertKey) {
                if(alertKey === 'inCondition') {
                    return true;
                }
                return _.any(pollResults, function(oidVal, oidKey){
                    if (oidKey.startsWith(alertKey) && doesMatch(alertVal, oidVal)) {
                        alertingValues[oidKey] = oidVal;
                        return true;
                    }
                });
            });

            alertItem = _.transform(alertItem, function(result, val, key) {
                //re-stringify the regexp values so that we store strings
                //not regex objects in the database.
                if(key === 'inCondition') {
                    result[key] = val;
                } else {
                    result[key] = val.toString();
                }
            });

            if (matched && !alertItem.inCondition) {
                alertItem.inCondition = true;
                result.push({
                    matches: alertItem,
                    data: alertingValues
                });
            }


            if (!matched && alertItem.inCondition) {
                alertItem.inCondition = false;
                result.push({
                    matches: alertItem,
                });
            }
            conf.alerts.push(alertItem);

        }, []);

       if (_.isEmpty(alertMatches)) {
            return Promise.resolve();
        }
        data.alerts = alertMatches;
        data = _.omit(data, 'config', 'result');
        /*
        * example data for data.alerts
        * [
        *    {
        *        matches:{
        *            '.1.3.6.1.2.1.1.5': /Mounted/,
        *            '.1.3.6.1.2.1.1.1': /Manage/,
        *            inCondition: true
        *        },
        *        data: {
        *            '.1.3.6.1.2.1.1.5.0': 'APC Rack Mounted UPS',
        *            '.1.3.6.1.2.1.1.1.0': 'APC Web/SNMP Management Card'
        *        }
        *    }
        *    ...
        * ]
        */
        return waterline.workitems.update({ id: data.workItemId}, { config: conf })
        .then(function() {
            return data;
        });
    };

    return SnmpPollerAlertJob;
}
