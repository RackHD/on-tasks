// Copyright 2015, EMC, Inc.
/* jshint node:true */

'use strict';

var uuid = require('node-uuid');

describe('Job.Trigger', function () {
    var base = require('./base-spec');

    base.before(function (context) {
        helper.setupInjector([
            helper.require('/spec/mocks/logger.js'),
            helper.require('/lib/jobs/base-job.js'),
            helper.require('/lib/jobs/trigger-job.js')
        ]);

        context.Jobclass = helper.injector.get('Job.Trigger');
    });

    describe('Base', function () {
        base.examples();
    });

    describe("trigger-job send mode", function() {
        var graphId = uuid.v4();

        beforeEach(function() {
            var jobOptions = {
                triggerMode: 'send',
                triggerGroup: 'testGroup',
                triggerType: 'testType'
            };
            this.job = new this.Jobclass(jobOptions, { graphId: graphId }, uuid.v4());
        });

        it('should publish a trigger when in send mode', function() {
            var self = this;
            sinon.stub(self.job, '_publishTrigger').resolves();

            self.job._run();
            expect(self.job._publishTrigger).to.have.been.calledOnce;
            expect(self.job._publishTrigger).to.have.been.calledWith(
                graphId,
                'testType',
                'testGroup'
            );

            return self.job._deferred;
        });
    });

    describe("trigger-job receive mode", function() {
        var graphId = uuid.v4();

        beforeEach(function() {
            var jobOptions = {
                triggerMode: 'receive',
                triggerGroup: 'testGroup',
                triggerType: 'testType'
            };
            this.job = new this.Jobclass(jobOptions, { graphId: graphId }, uuid.v4());
        });

        it('should subscribe to a trigger when in receive mode', function() {
            var self = this;
            sinon.stub(self.job, '_subscribeTrigger').resolves();

            self.job._run();
            expect(self.job._subscribeTrigger).to.have.been.calledOnce;
            expect(self.job._subscribeTrigger).to.have.been.calledWith(
                graphId,
                'testType',
                'testGroup'
            );

            var doneCallback = self.job._subscribeTrigger.firstCall.args[3].bind(self.job);
            doneCallback();

            return self.job._deferred;
        });
    });
});
