// Copyright 2015, EMC, Inc.

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
    '_',
    "Services.Waterline"
));
function ipmiSdrPollerAlertJobFactory(
    PollerAlertJob,
    Logger,
    util,
    assert,
    Promise,
    _,
    waterline
    ) {

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
        return waterline.workitems.needByIdentifier(data.workItemId)
        .then(function (workitem) {
            var conf = workitem.config;

            function processDiscreteSdr(val, conf, results) {
                var alertObj;
                var sensorKey = val.sensorId.replace(/_/ig, '.');
                var statesAsserted = _.has(val, 'statesAsserted') ? val.statesAsserted : [];

                //update conf.inCondition.Discrete list
                if (statesAsserted.length > 0 && !_.has(conf.inCondition.discrete, sensorKey)) {
                    conf.inCondition.discrete[sensorKey] = {};
                }
                _.forEach(statesAsserted, function(state) {
                    alertObj = _.omit(data, 'sdr');
                    alertObj.reading = _.omit(val, 'statesAsserted');
                    alertObj.reading.stateAsserted = state;
                    alertObj.inCondition = true;
                    alertObj.node = data.node;
                    results.push(alertObj);
                    conf.inCondition.discrete[sensorKey][state] = true;
                });
                //Iterate the inCondition.discrete[sensorKey]
                //Alert and clear inCondition for any state that is no longer asserted.
                _.forEach(_.difference(_.keys(conf.inCondition.discrete[sensorKey]),
                    statesAsserted), function(state) {
                    if (conf.inCondition.discrete[sensorKey][state]) {
                        alertObj = _.omit(data, 'sdr');
                        alertObj.reading = _.omit(val, 'statesAsserted');
                        alertObj.reading.stateAsserted = state;
                        alertObj.inCondition = false;
                        alertObj.node = data.node;
                        results.push(alertObj);
                        conf.inCondition.discrete[sensorKey][state] = false;
                    }
                });
            }

            function processThresholdSdr(val, conf, results) {
                /* publish an alert if an active fault is detected (inCondition asserted) or
                 * if a fault has just transitioned from active to inactive (inCondition is not
                 * asserted, but conf.inCondition is).
                 */
                var alertObj;
                var sensorKey = val.sensorId.replace(/_/ig, '.');
                var unavailableStatuses = ['Not Available', 'ns', 'No Reading',
                    'na', 'disabled', 'Disabled', 'Not Readable'];
                var inCondition = val.status !== 'ok' &&
                    !_.contains(unavailableStatuses, val.status);
                var doAlert = false;
                if (!_.has(conf.inCondition.threshold, sensorKey)) {
                    doAlert = inCondition;
                } else {
                    doAlert = inCondition || conf.inCondition.threshold[sensorKey];
                }

                if (doAlert) {
                    alertObj = _.omit(data, 'sdr');
                    alertObj.reading = val;
                    alertObj.inCondition = inCondition;
                    alertObj.node = data.node;
                    conf.inCondition.threshold[sensorKey] = inCondition;
                    results.push(alertObj);
                }
            }

            if (_.has(conf, 'inCondition')) {
                conf.inCondition.discrete = _.transform(conf.inCondition.discrete,
                                                        function (result, val, key) {
                    result[key.replace(/_/ig, '.')] = val;
                });
                conf.inCondition.threshold = _.transform(conf.inCondition.threshold,
                                                         function (result, val, key) {
                    result[key.replace(/_/ig, '.')] = val;
                });
            } else {
                var inCondition = {
                    'discrete': {},
                    'threshold': {}
                };
                conf.inCondition = inCondition;
            }

            // Set the pollerName var
            data.pollerName = "sdr";
            var alerts = _.transform(data.sdr, function (results, val) {
                var sdrType = val.sdrType.replace(/_/ig, '.');

                //Check if sdrType is Discrete/Threshold
                if (sdrType === 'Discrete') {
                    // Discrete SDRs may require several alerts since more
                    // than one state can be asserted.
                    processDiscreteSdr(val, conf, results);
                } else if (sdrType === 'Threshold') {
                    // Threshold SDRs should produce at most one alert
                    processThresholdSdr(val, conf, results);
                }
            });
            conf.inCondition.discrete = _.transform(conf.inCondition.discrete,
                                                    function (result, val, key) {
                result[key.replace(/\./ig, '_')] = val;
            });
            conf.inCondition.threshold = _.transform(conf.inCondition.threshold,
                                                     function (result, val, key) {
                result[key.replace(/\./ig, '_')] = val;
            });
            return [alerts, waterline.workitems.update({ id: data.workItemId }, { config: conf })];
        })
        .spread(function (alerts) {
            return _.isEmpty(alerts) ? undefined : alerts;
        })
        .catch(function (err) {
            logger.error(err.message, { error: err, data: data });
        });
    };

    return IpmiSdrPollerAlertJob;
}
