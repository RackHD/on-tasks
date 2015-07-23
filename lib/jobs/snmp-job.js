// Copyright 2014-2015, Renasar Technologies Inc.
/* jshint: node:true */

'use strict';

var di = require('di');

module.exports = snmpJobFactory;
di.annotate(snmpJobFactory, new di.Provide('Job.Snmp'));
di.annotate(snmpJobFactory, new di.Inject(
    'Job.Base',
    'JobUtils.Snmptool',
    'Constants',
    'Logger',
    'Util',
    'Assert',
    'Promise',
    di.Injector
));

function snmpJobFactory(BaseJob, SnmpTool, Constants, Logger, util, assert, Promise, injector) {
    var logger = Logger.initialize(snmpJobFactory);

    /**
     *
     * @param {Object} options
     * @param {Object} context
     * @param {String} taskId
     * @constructor
     */
    function SnmpJob(options, context, taskId) {
        SnmpJob.super_.call(this, logger, options, context, taskId);

        this.routingKey = context.graphId;
        assert.uuid(this.routingKey);
    }

    util.inherits(SnmpJob, BaseJob);

    /**
     * @memberOf SnmpJob
     */
    SnmpJob.prototype._run = function() {
        // NOTE: this job will run indefinitely absent user intervention
        var self = this;

        self._subscribeRunSnmpCommand(self.routingKey, function(data) {
            assert.object(data.config, 'SNMP poller data config');

            return Promise.resolve()
            .then(function() {
                if (data.config.metric) {
                    return self._collectMetricData(data);
                } else {
                    var snmptool = new SnmpTool(data.host, data.community);
                    return snmptool.collectHostSnmp(data.config.oids);
                }
            })
            .then(function(result) {
                data.result = result;
                if (data.config.metric) {
                    return self._publishMetricResult(self.routingKey, data.config.metric, data);
                } else {
                    return self._publishSnmpCommandResult(self.routingKey, data);
                }
            })
            .catch(function (err) {
                logger.warning("Failed to capture data through SNMP.", {
                    data: data,
                    error: err
                });
            });
        });
    };

    /**
     * @memberOf SnmpJob
     */
    SnmpJob.prototype._collectMetricData = function(data) {
        assert.object(data);
        assert.object(data.config);
        assert.string(data.config.metric);
        var Metric, metric;

        switch (data.config.metric) {
            case Constants.WorkItems.Pollers.Metrics.SnmpInterfaceBandwidthUtilization:
                Metric = injector.get('JobUtils.Metrics.Snmp.InterfaceBandwidthUtilizationMetric');
                metric = new Metric(data.node, data.host, data.community, data.pollInterval);
                break;
            case Constants.WorkItems.Pollers.Metrics.SnmpInterfaceState:
                Metric = injector.get('JobUtils.Metrics.Snmp.InterfaceStateMetric');
                metric = new Metric(data.node, data.host, data.community);
                break;
            default:
                throw new Error("Unknown poller metric name: " + data.config.metric);
        }

        return metric.collectMetricData(data);
    };

    return SnmpJob;
}
