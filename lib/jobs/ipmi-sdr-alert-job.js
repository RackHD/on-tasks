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
        .then(function(workitem) {

            var conf = workitem.config;
            if(_.has(conf, 'inCondition')) {
                conf.inCondition = _.transform(conf.inCondition, function(result, val, key) {
                    result[key.replace(/_/ig, '.')] = val;
                });
            } else {
                conf.inCondition = {};
            }
            // Set the pollerName var
            data.pollerName = "sdr";

            var alerts = _.transform(data.sdr, function(results, val) {
                var alertObj;
                var sensorKey = val['Sensor Id'].replace(/_/ig, '.');

                /* publish an alert if an active fault is detected (inCondition asserted) or
                 * if a fault has just transitioned from active to inactive (inCondition is not
                 * asserted, but conf.inCondition is).
                 */
                var unavailableStatuses = ['Not Available', 'ns', 'No Reading',
                    'na','disabled', 'Disabled', 'Not Readable'];

                var inCondition = val.Status !== 'ok' &&
                    !_.contains(unavailableStatuses, val.Status);

                var doAlert = inCondition || conf.inCondition[sensorKey];

                if (doAlert) {
                    alertObj = _.omit(data, 'sdr');
                    alertObj.reading = val;
                    alertObj.inCondition = inCondition;
                    alertObj.node = data.node;
                    conf.inCondition[sensorKey] = inCondition;
                    results.push(alertObj);
                }
            });

            conf.inCondition = _.transform(conf.inCondition, function(result, val, key) {
                result[key.replace(/\./ig, '_')] = val;
            });
            return [alerts, waterline.workitems.update({ id: data.workItemId }, { config: conf })];
        })
        .spread(function(alerts) {
          return _.isEmpty(alerts) ? undefined : alerts;
        })
        .catch(function(err) {
            logger.error(err.message, { error:err, data:data });
        });
    };

    return IpmiSdrPollerAlertJob;
}
