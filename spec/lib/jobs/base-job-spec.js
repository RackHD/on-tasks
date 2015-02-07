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

        var taskProtocol = injector.get('Protocol.Task');
        var eventsProtocol = injector.get('Protocol.Events');

        _.forEach(Object.getPrototypeOf(taskProtocol), function(f, funcName) {
            var spy = sinon.spy(function() {
                var deferred = Q.defer();
                process.nextTick(function() {
                    deferred.resolve(spy);
                });
                return deferred.promise;
            });
            spy.dispose = sinon.stub();
            spy.dispose = sinon.stub();
            taskProtocol[funcName] = spy;
        });
        _.forEach(Object.getPrototypeOf(eventsProtocol), function(f, funcName) {
            var spy = sinon.spy(function() {
                var deferred = Q.defer();
                process.nextTick(function() {
                    deferred.resolve(spy);
                });
                return deferred.promise;
            });
            spy.dispose = sinon.stub();
            spy.dispose = sinon.stub();
            eventsProtocol[funcName] = spy;
        });

        MockJob = function() {
            var logger = injector.get('Logger').initialize(MockJob);
            MockJob.super_.call(this, logger, {}, {}, uuid.v4());
            this.nodeId = "54c69f87c7100ec77bfde17c";
            this.snmpRoutingKey = uuid.v4();
            this.ipmiSdrRoutingKey = uuid.v4();
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
                    var stub = sinon.stub();
                    stub.bind = sinon.stub();
                    // Call all subscriber methods with appropriate arity, and
                    // the callback as the last argument
                    var args = _.range(job[funcName].length - 1);
                    job[funcName].apply(job, args.concat([stub]));
                    // Assert that we always bind the callback
                    expect(stub.bind).to.have.been.calledOnce;
                    numSubscriberMethods += 1;
                }
            });

            expect(job.subscriptionPromises).to.have.length(numSubscriberMethods);
            expect(job.subscriptions).to.have.length(0);

            job.on('done', function() {
                _.forEach(job.subscriptions, function(subscription) {
                    try {
                        expect(subscription.dispose.calledOnce).to.equal(true);
                    } catch (e) {
                        done(e);
                    }
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
                job._done();
            }).catch(function(error) {
                done(error);
            });
        });
    });
});
