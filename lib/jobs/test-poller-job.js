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

        assert.uuid(this.options.ipmiSdrRoutingKey);
        assert.uuid(this.options.snmpRoutingKey);

        this.ipmiSdrRoutingKey = this.options.ipmiSdrRoutingKey;
        this.snmpRoutingKey = this.options.snmpRoutingKey;
    }
    util.inherits(TestPollerJob, BaseJob);

    /**
     * @memberOf TestPollerJob
     */
    TestPollerJob.prototype._run = function run() {
        // NOTE: this job will run indefinitely absent user intervention
        var self = this;

        logger.info("Running test poller", {
            graphId: self.instanceId
        });

        var ipmiMachine = {
            user: 'admin',
            password: 'admin',
            ip: '10.1.1.1'
        };

        setInterval(function() {
            self._publishRunIpmiSdrCommand(self.ipmiSdrRoutingKey, ipmiMachine);
        }, 1000);

        var snmpHostData = {
            ip: '10.1.1.1',
            communityString: 'public'
        };

        setInterval(function() {
            self._publishRunSnmpCommand(self.snmpRoutingKey, snmpHostData);
        }, 1000);
    };

    return TestPollerJob;
}
