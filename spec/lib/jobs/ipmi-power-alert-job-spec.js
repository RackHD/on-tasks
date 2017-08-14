// Copyright 2015, EMC, Inc.
/* jshint node:true */

'use strict';

var uuid = require('node-uuid')

describe(require('path').basename(__filename), function () {
    var base = require('./base-spec');
    base.before(function (context) {
        // create a child injector with on-core and the base pieces we need to test this
        helper.setupInjector([
            helper.require('/spec/mocks/logger.js'),
            helper.require('/lib/jobs/base-job.js'),
            helper.require('/lib/jobs/ipmi-power-alert-job.js'),
        ]);
        context.Jobclass = helper.injector.get('Job.Poller.Alert.Ipmi.Power');
    });
        
    describe("ipmi-poller-alert-ipmi-power-job", function() {
        beforeEach(function() {
            this.sandbox = sinon.sandbox.create();
            var graphId = uuid.v4();
            this.ipmi = new this.Jobclass({}, { graphId: graphId }, uuid.v4());
            this.ipmi._publishPollerAlert = this.sandbox.stub().resolves();
            expect(this.ipmi.routingKey).to.equal(graphId);
        });
        describe('Base', function () {
            base.examples();
        });

        it("should have a _run() method", function() {
            expect(this.ipmi).to.have.property('_run').with.length(0);
        });

        it("should have a power command subscribe method", function() {
            expect(this.ipmi).to.have.property('_subscribeRunIpmiCommand').with.length(3);
        });
        
        it("should send power state alert if powerState changes", function() {
            var self = this;
            var testState = {powerStatus: 'ON'};
            self.ipmi.previousPowerStatus = 'OFF';
            return self.ipmi.callback(testState)
                .then(function(status) {
                    expect(status).to.deep.equal(testState);
                    expect(self.ipmi.previousPowerStatus).to.equal(status.powerStatus);
                    expect(self.ipmi._publishPollerAlert.callCount).to.equal(1);
                });
        });
        it("should not send power state alert if powerState doesn't change", function() {
            var self = this;
            var testState = {powerStatus: 'OFF'};
            self.ipmi.previousPowerStatus = 'OFF';
            return self.ipmi.callback(testState)
                .then(function(status) {
                    expect(status).to.deep.equal(testState);
                    expect(self.ipmi.previousPowerStatus).to.equal(status.powerStatus);
                    expect(self.ipmi._publishPollerAlert.callCount).to.equal(0);
                });
        });

    });
});
