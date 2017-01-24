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

        var subscriptionArgs = [context.graphId, 'selEntries'];

        IpmiSelPollerAlertJob.super_.call(this, logger, options, context, taskId,
                '_subscribeIpmiCommandResult', subscriptionArgs);
    }
    util.inherits(IpmiSelPollerAlertJob, PollerAlertJob);

    IpmiSelPollerAlertJob.prototype._formatSelAlert = function _formatSelAlert(data) {
        /*
         * data format:
           { alerts: [ { data: [Object], matches: [Object], action: 'critical' } ],
             user: 'admin',
             host: '192.168.188.91',
             node: '5858c7f7f6f0ce7d08a7298b',
             lastPreviouslyReadSelEntry: '0000',
             lastSelDeleteTimeLastRun: '2017-01-10T01:28:13.000Z',
             workItemId: '5858c89bca4349fa0409ba8c',
             pollerName: 'sel' }
         * expected event format:
           [{ type: 'polleralert',
              action: 'sel.updated',
              typeId: '5858c89bca4349fa0409ba8c',
              nodeId: '5858c7f7f6f0ce7d08a7298b',
              severity: 'critical',
              data: {
                 { user: 'admin',
                   host: '192.168.188.91',
                   alert: { reading: [Object], matches: [Object] }
                 }}} ]
         */
        assert.array(data.alerts, 'alerts');

        var template = {
            type: 'polleralert',
            action: 'sel.updated',
            typeId: data.workItemId,
            nodeId: data.node,
            severity: '',
            data: {
                user: data.user,
                host: data.host,
                alert: {}
            }
        };

        return _.transform(data.alerts, function(result, item){
            var tmp = _.cloneDeep(template);

            tmp.data.alert.matches = _.cloneDeep(item.matches);
            tmp.data.alert.reading = _.cloneDeep(item.data);
            tmp.severity = item.action;

            result.push(tmp);
        });
    };


    IpmiSelPollerAlertJob.prototype._determineAlert = function _determineAlert(data) {
        var self = this;
        var action = "";
        // Code to handle null data

        if(!data) {
            return Promise.resolve();
        }
        return waterline.nodes.findOne({id: data.node}).then(function(nodeObj) {
            data.pollerName = "sel";
            if(nodeObj && nodeObj.sku) {
                return env.get('config.sel', {}, [ nodeObj.sku ]);
            }
            return {};
        })
        .then(function(skuConfig) {
            return _.merge({}, skuConfig, data);
        })
        .then(function(data) {
            if(!_.get(data, 'alerts')) {
                return;
            }

            var alertData = _.omit(data, 'selEntries');
            alertData.alerts = _.compact(_.map(data.selEntries, function (v) {
                var doesMatch;
                var tmpAction;
                var matches = _.compact(_.map(data.alerts, function (alertItem) {
                    tmpAction = alertItem.action;
                    var matchNumber = 0;
                    alertItem = _.omit(alertItem, 'action');
                    _.forEach(alertItem, function (alertValue, alertKey) {
                        doesMatch = true;
                        if(alertValue[0] === '/' && _.last(alertValue) === '/') {
                            var regexString = alertValue.slice(1, alertValue.length - 1);
                            var regex = new RegExp(regexString);
                            if(regex.test(v[alertKey])) {
                                matchNumber = matchNumber + 1;
                                return;
                            } else {
                                doesMatch = false;
                            }
                        } else if(alertValue === v[alertKey]) {
                            matchNumber = matchNumber + 1;
                            return;
                        } else {
                            doesMatch = false;
                        }
                    });
                    if(doesMatch && matchNumber === Object.keys(alertItem).length) {
                        action = tmpAction;
                        return alertItem;
                    }
                }));
                if(!_.isEmpty(matches)) {
                    return {
                        data: v,
                        matches: matches,
                        action: action
                    };
                }
            }));
            if (!_.isEmpty(alertData.alerts)) {
                return [alertData, self._formatSelAlert(alertData)];
            }
        });
    };

    return IpmiSelPollerAlertJob;
}
