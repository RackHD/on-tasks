// Copyright 2015, Renasar Technologies Inc.
/* jshint node:true */

'use strict';

var uuid = require('node-uuid'),
    events = require('events');

describe(require('path').basename(__filename), function () {
    var base = require('./base-spec');
    var collectMetricDataStub;
    var metricStub;

    base.before(function (context) {
        // create a child injector with on-core and the base pieces we need to test this
        collectMetricDataStub = sinon.stub();
        metricStub = function() {};
        metricStub.prototype.collectMetricData = collectMetricDataStub;

        helper.setupInjector([
            helper.require('/spec/mocks/logger.js'),
            helper.requireGlob('/lib/services/*.js'),
            helper.require('/lib/utils/job-utils/ansible.js'),
            helper.require('/lib/jobs/base-job.js'),
            helper.require('/lib/jobs/ansible-job.js')
        ]);

        context.Jobclass = helper.injector.get('Job.Ansible.Playbook');
    });

    describe('Base', function () {
        base.examples();
    });

    describe("ansible-job", function() {
        var Snmptool;
        var Constants;
        before(function() {
        });

        beforeEach(function() {
            var graphId = uuid.v4();
            this.ansible = new this.Jobclass({}, { graphId: graphId }, uuid.v4());
            this.ansibleTool = helper.injector.get('JobUtils.Ansible.Playbook');
            expect(this.ansible.routingKey).to.equal(graphId);
        });

        it("should have a _run() method", function() {
            expect(this.ansible).to.have.property('_run').with.length(0);
        });

        it("should have a snmp command subscribe method", function() {
            expect(this.ansible).to.have.property('_subscribeAnsibleCommand').with.length(2);
        });

    });
});
