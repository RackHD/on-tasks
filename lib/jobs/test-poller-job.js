// Copyright 2014-2015, Renasar Technologies Inc.
/* jshint: node:true */

'use strict';

var di = require('di');

module.exports = testPollerJobFactory;
di.annotate(testPollerJobFactory, new di.Provide('Job.Test.Poller'));
di.annotate(testPollerJobFactory, new di.Inject(
    'Job.Base',
    'Logger',
    'Util',
    'Assert'
));
function testPollerJobFactory(BaseJob, Logger, util, assert) {
    var logger = Logger.initialize(testPollerJobFactory);

    /**
     *
     * @param {Object} options
     * @param {Object} context
     * @param {String} taskId
     * @constructor
     */
    function TestPollerJob(options, context, taskId) {
        TestPollerJob.super_.call(this, logger, options, context, taskId);
        assert.uuid(this.context.graphId);
        this.routingKey = this.context.graphId;
    }
    util.inherits(TestPollerJob, BaseJob);

    /**
     * @memberOf TestPollerJob
     */
    TestPollerJob.prototype._run = function run() {
        // NOTE: this job will run indefinitely absent user intervention
        var self = this;

        setInterval(function() {
            var config = {
                user: 'admin',
                password: 'admin',
                host: '10.1.1.230',
                workItemId: "54d6cdff8db79442ddf11111"
            };
            self._publishRunIpmiCommand(self.routingKey, 'sdr', config);
        }, 1000);

        setInterval(function() {
            var config = {
                user: 'admin',
                password: 'admin',
                host: '10.1.1.230',
                workItemId: "54d6cdff8db79442ddf22222"
            };
            self._publishRunIpmiCommand(self.routingKey, 'power', config);
        }, 1000);

        setInterval(function() {
            var config = {
                user: 'admin',
                password: 'admin',
                host: '10.1.1.230',
                workItemId: "54d6cdff8db79442ddf33333",
                alerts: [
                    {
                        sensor: "System Event",
                        "event": "/Timestamp.*/"
                    }
                ]
            };
            self._publishRunIpmiCommand(self.routingKey, 'sel', config);
        }, 1000);

        setInterval(function() {
            var config = {
                ip: '10.1.1.10',
                communityString: 'public',
                extensionMibs: [
                    'IF-MIB::ifXTable',
                    'IF-MIB::ifTable',
                    'LLDP-MIB::lldpStatsRxPortTable',
                    'LLDP-MIB::lldpStatsTxPortTable'
                ],
                workItemId: "54d6cdff8db79442ddf44444"
            };
            self._publishRunSnmpCommand(self.routingKey, config);
        }, 1000);
    };

    return TestPollerJob;
}
