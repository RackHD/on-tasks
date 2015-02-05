// Copyright 2015, Renasar Technologies Inc.
/* jshint node:true */

'use strict';

var events = require('events'),
    uuid = require('node-uuid'),
    util = require('util'),
    _ = require('lodash'),
    Q = require('q');

describe("Base Job", function () {
    var injector;
    var BaseJob;
    var MockJob;
    var base = require('./base-spec');

    base.before(function (context) {
        var _ = helper.baseInjector.get('_');
        // create a child injector with renasar-core and the base pieces we need to test this
        injector = helper.baseInjector.createChild(_.flatten([
            helper.require('/spec/mocks/logger.js'),
            helper.require('/lib/jobs/base-job.js')
        ]));

        injector.get('Services.Messenger').subscribe = sinon.stub().returns(Q.resolve({}));

        context.Jobclass = injector.get('Job.Base');
        BaseJob = context.Jobclass;

        MockJob = function() {
            var logger = injector.get('Logger').initialize(MockJob);
            MockJob.super_.call(this, logger, {}, {}, uuid.v4());
            this.nodeId = "54c69f87c7100ec77bfde17c";
            this.graphId = uuid.v4();
        };

        util.inherits(MockJob, BaseJob);

        MockJob.prototype._run = sinon.stub();
    });

    base.examples();

    describe("", function() {
        it('should be an EventEmitter', function() {
            var job = new MockJob();
            expect(job).to.be.an.instanceof(events.EventEmitter);
        });
    });

    describe('Subscriptions', function() {
        it("should call subclass _run()", function() {
            var job = new MockJob();
            job._run = sinon.stub();
            job.run();
            expect(job._run).to.have.been.called.once;
        });

        it("should clean up on done", function(done) {
            var job = new MockJob();

            var numSubscriberMethods = 0;
            _.forEach(BaseJob.prototype, function(func, funcName) {
                if (funcName.indexOf('_subscribe') === 0) {
                    job[funcName](sinon.stub());
                    numSubscriberMethods += 1;
                }
            });

            expect(job.subscriptionPromises).to.have.length(numSubscriberMethods);
            expect(job.subscriptions).to.have.length(0);

            job.on('done', function() {
                _.forEach(job.subscriptions, function(subscription) {
                    expect(subscription.dispose).to.have.been.called.once;
                });
                process.nextTick(function() {
                    // assert removeAllListeners() called
                    expect(job._events).to.be.empty;

                    done();
                });
            });

            Q.all(job.subscriptionPromises)
            .then(function() {
                expect(job.subscriptions).to.have.length(numSubscriberMethods);
                _.forEach(job.subscriptions, function(subscription) {
                    subscription.dispose = sinon.stub();
                });

                job._done();
            }).catch(function(error) {
                done(error);
            });
        });
    });
});
