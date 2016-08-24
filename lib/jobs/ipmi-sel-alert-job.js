// Copyright 2015, EMC, Inc.

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
    '_',
    'Services.Waterline',
    'Services.Environment'
));
function ipmiSelPollerAlertJobFactory(
    PollerAlertJob,
    Logger,
    util,
    assert,
    Promise,
    _,
    waterline,
    env
) {
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
        var action = "";
        // Code to handle null data
        if (!data) {
            return Promise.resolve();
        }
        return waterline.nodes.findOne({id: data.node}).then(function(nodeObj) {
            data.pollerName = "sel";
            if(nodeObj && nodeObj.sku) {
                return env.get('config.sel', {}, [ nodeObj.sku ])               
            }
            return {};
        })
        .then(function(skuConfig) {
            return  _.merge({}, skuConfig, data);
        })
        .then(function(data) {

            if(!_.get(data, 'alerts'))
                return;

            // Only get the most recent value to alert on, e.g. if power unit 2
            // became non-redundant, and then fully redundant again, we don't want
            // to alert that because a good state has been restored.

            var latestValuesPerSensor = _.transform(data.sel, function (result, entry) {
                result[entry["Sensor Type"]+ '::' + entry["Event Type"]] = entry;
            }, {});


            var alertData = _.omit(data, 'sel');

            alertData.alerts = _.compact(_.map(latestValuesPerSensor, function (v) {
                var doesMatch;
                var tmpAction;
                var matches = _.compact(_.map(data.alerts, function (alertItem) {
                    tmpAction = alertItem.action;
                    var matchNumber = 0;
                    alertItem = _.omit(alertItem, 'action')
                    _.forEach(alertItem, function (alertValue, alertKey) {
                        doesMatch = true;
                        if (alertValue[0] === '/' && _.last(alertValue) === '/') {
                            var regexString = alertValue.slice(1, alertValue.length - 1);
                            var regex = new RegExp(regexString);
                            if (regex.test(v[alertKey])) {
                                matchNumber = matchNumber + 1;
                                return;
                            } else {
                                doesMatch = false;
                            }
                        } else if (alertValue === v[alertKey]) {
                            matchNumber = matchNumber + 1;
                            return;
                        } else {
                            doesMatch = false;
                        }
                    });
                    if (doesMatch && matchNumber === Object.keys(alertItem).length) {
                        action =tmpAction
                        return alertItem;
                    }
                }));
                if (!_.isEmpty(matches)) {
                    return {
                        data: v,
                        matches: matches,
                        action: action
                    };
                }
            }));

            if (!_.isEmpty(alertData.alerts)) {
                return alertData;
            }
        });
    };

    return IpmiSelPollerAlertJob;
}
