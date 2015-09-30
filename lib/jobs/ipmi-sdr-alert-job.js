// Copyright 2015, EMC, Inc.
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

            var alerts = _.transform(data.sdr, function(results, val) {
                var alertObj;
                if (val.Status !== 'ok' && val.Status !== 'Not Available'  &&
                        !conf.inCondition[val['Sensor Id']]) {
                    alertObj = _.omit(data, 'sdr');
                    alertObj.reading = val;
                    alertObj.inCondition = true;
                    alertObj.node = data.node;
                    conf.inCondition[val['Sensor Id'].replace(/\./ig, '_')] = true;
                    results.push(alertObj);

                } else if (val.Status === 'ok'  && conf.inCondition[val['Sensor Id']]) {
                    alertObj = _.omit(data, 'sdr');
                    alertObj.reading = val;
                    alertObj.inCondition = false;
                    alertObj.node = data.node;
                    conf.inCondition[val['Sensor Id'].replace(/\./ig, '_')] = false;

                    results.push(alertObj);
                }
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
