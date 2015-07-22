// Copyright 2014-2015, Renasar Technologies Inc.
/* jshint: node:true */

'use strict';

var di = require('di');

module.exports = snmpJobFactory;
di.annotate(snmpJobFactory, new di.Provide('Job.Snmp'));
di.annotate(snmpJobFactory, new di.Inject(
    'Job.Base',
    'JobUtils.Snmptool',
    'Logger',
    'Util',
    'Assert'
));

function snmpJobFactory(BaseJob, SnmpTool, Logger, util, assert) {
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
    SnmpJob.prototype._run = function run() {
        // NOTE: this job will run indefinitely absent user intervention
        var self = this;

        self._subscribeRunSnmpCommand(self.routingKey, function(data) {
            assert.object(data.config, 'SNMP poller data config');

            var snmptool = new SnmpTool(data.host, data.community);

            return snmptool.collectHostSnmp(data.config.oids)
            .then(function(result) {
                data.result = result;
                return self._publishMetricResult(self.routingKey, 'testmetricname', data);
            })
            .catch(function (err) {
                logger.warning("Failed to capture data through SNMP.", {
                    data: data,
                    error: err
                });
            });
        });
    };

    return SnmpJob;
}
