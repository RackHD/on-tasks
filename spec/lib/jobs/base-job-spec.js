// Copyright 2015, EMC, Inc.
/* jshint node:true */

'use strict';

var uuid = require('node-uuid'),
    util = require('util');

describe("Base Job", function () {
    var BaseJob;
    var MockJob;
    var taskProtocol;
    var eventsProtocol;

    before('Base Job before', function () {
        // create a child injector with on-core and the base pieces we need to test this
        helper.setupInjector([
            helper.require('/lib/jobs/base-job.js')
        ]);

        helper.injector.get('Services.Messenger').subscribe = sinon.stub().resolves({});

        BaseJob = helper.injector.get('Job.Base');

        taskProtocol = helper.injector.get('Protocol.Task');
        eventsProtocol = helper.injector.get('Protocol.Events');

        var Logger = helper.injector.get('Logger');
        sinon.stub(Logger.prototype, 'log');

        _.forEach(Object.getPrototypeOf(taskProtocol), function(f, funcName) {
            var spy = sinon.spy(function() {
                return new Promise(function (resolve) {
                    process.nextTick(function() {
                        resolve(spy);
                    });
                });
            });
            spy.dispose = sinon.stub();
            spy.dispose = sinon.stub();
            taskProtocol[funcName] = spy;
        });
        _.forEach(Object.getPrototypeOf(eventsProtocol), function(f, funcName) {
            var spy = sinon.spy(function() {
                return new Promise(function (resolve) {
                    process.nextTick(function() {
                        resolve(spy);
                    });
                });
            });
            spy.dispose = sinon.stub();
            spy.dispose = sinon.stub();
            eventsProtocol[funcName] = spy;
        });

        function InnerMockJob() {
            var logger = helper.injector.get('Logger').initialize(InnerMockJob);
            InnerMockJob.super_.call(this, logger, {}, {}, uuid.v4());
            this.nodeId = "54c69f87c7100ec77bfde17c";
            this.context = {};
            this.context.target = 'testtarget';
            this.graphId = uuid.v4();
        }
        util.inherits(InnerMockJob, BaseJob);

        InnerMockJob.prototype._run = function() {
            this._done();
        };
        InnerMockJob.prototype._cleanup = function() {};

        MockJob = InnerMockJob;
    });

    beforeEach('Base Job beforeEach', function() {
        _.forEach(Object.getPrototypeOf(taskProtocol), function(f, funcName) {
            taskProtocol[funcName].dispose.reset();
        });
        _.forEach(Object.getPrototypeOf(eventsProtocol), function(f, funcName) {
            eventsProtocol[funcName].dispose.reset();
        });
    });

    describe('Subclassed methods', function() {
        var job;

        before('Base Job Subclassed methods before', function() {
            sinon.spy(MockJob.prototype, 'cleanup');
            sinon.spy(MockJob.prototype, '_run');
        });

        beforeEach('Base Job Subclassed methods beforeEach', function() {
            MockJob.prototype.cleanup.reset();
            MockJob.prototype._run.reset();

            job = new MockJob();
            job._cleanup = sinon.stub();
        });

        after('Base Job Subclassed methods after', function() {
            MockJob.prototype.cleanup.restore();
            MockJob.prototype._run.restore();
        });

        it("should call subclass _run()", function() {
            return job.run()
            .then(function() {
                expect(job._run).to.have.been.calledOnce;
            });
        });

        it("should call subclass _cleanup() if it exists", function() {
            job._done();

            return job.run()
            .then(function() {
                expect(job._cleanup).to.have.been.calledOnce;
                expect(job.cleanup).to.have.been.calledOnce;
            });
        });

        it("should resolve cleanup() if it is not subclassed", function() {
            job._cleanup = null;
            return expect(job.cleanup()).to.eventually.be.fulfilled;
        });
    });

    describe('Subscriptions', function() {
        var job;

        before('Base Job Subscriptions before', function() {
            sinon.spy(MockJob.prototype, '_run');
        });

        beforeEach('Base Job Subscriptions beforeEach', function() {
            MockJob.prototype._run.reset();
            job = new MockJob();
        });

        after('Base Job Subscriptions after', function() {
            MockJob.prototype._run.restore();
        });

        it("should respond to activeTaskExists requests", function() {
            job._subscribeActiveTaskExists = sinon.stub().resolves();

            return job.run()
            .then(function() {
                expect(job._run).to.have.been.calledOnce;
                expect(job._subscribeActiveTaskExists).to.have.been.calledOnce;
                var callback = job._subscribeActiveTaskExists.firstCall.args[0];
                expect(callback()).to.deep.equal(job.serialize());
            });
        });

        it('should have a subscription to activeTaskExists if there is a target', function() {
            return job.run()
            .then(function() {
                expect(job.subscriptions).to.be.an('array').with.length(1);
                expect(job.subscriptions[0].toString()).to.equal('subscribeActiveTaskExists');
            });
        });

        it("should clean up subscriptions for every subscriber helper method", function() {
            var numSubscriberMethods = 0;
            // Call every AMQP subscriber helper method
            _.forEach(BaseJob.prototype, function(func, funcName) {
                // _subscribeActiveTaskExists should be added internally
                if (funcName.indexOf('_subscribe') === 0 &&
                    funcName !== '_subscribeActiveTaskExists') {

                    var stub = sinon.stub();
                    stub.call = sinon.stub();
                    // Call all subscriber methods with appropriate arity, and
                    // the callback as the last argument
                    var args = _.range(job[funcName].length - 1);
                    job[funcName].apply(job, args.concat([stub]));
                    numSubscriberMethods += 1;
                }
            });

            expect(job.subscriptionPromises).to.have.length(numSubscriberMethods);
            expect(job.subscriptions).to.have.length(0);

            return job.run()
            .then(function() {
                // account for subscribeActiveTaskExists
                expect(job.subscriptions).to.have.length(numSubscriberMethods + 1);

                _.forEach(job.subscriptions, function(subscription) {
                    if (subscription.toString() === 'subscribeTrigger') {
                        expect(subscription.dispose).to.have.been.calledTwice;
                    } else {
                        expect(subscription.dispose).to.have.been.calledOnce;
                    }
                });
            });
        });

        describe("poller callbacks", function() {
            var encryption;
            var lookup;

            before(function() {
                lookup = helper.injector.get('Services.Lookup');
                encryption = helper.injector.get('Services.Encryption');
                encryption.start();
            });

            beforeEach(function() {
                this.sandbox = sinon.sandbox.create();
            });

            afterEach(function() {
                this.sandbox.restore();
            });

            after(function() {
                encryption.stop();
            });

            describe("IPMI run command", function() {
                it("should decrypt a password", function() {
                    var iv = 'vNtIgxV4kh0XHSa9ZJxkSg==';
                    var password = encryption.encrypt('password', iv);
                    var callback = function() {};
                    callback.call = sinon.stub();
                    var data = {
                        password: password
                    };
                    job._runIpmiCommandCallback(callback, data);
                    expect(callback.call.firstCall.args[1]).to.deep.equal({
                        password: 'password'
                    });
                });

                it("should convert a host mac address to an IP", function() {
                    this.sandbox.stub(lookup, 'macAddressToIp');
                    lookup.macAddressToIp.resolves({
                        host: '10.1.1.2'
                    });
                    var callback = function() {};
                    callback.call = sinon.stub();
                    var data = {
                        host: '7a:c0:7a:c0:be:ef'
                    };
                    job._runIpmiCommandCallback(callback, data);

                    process.nextTick(function() {
                        expect(callback.call.firstCall.args[1]).to.deep.equal({
                            host: '10.1.1.2'
                        });
                    });
                });
            });

            describe("SNMP run command", function() {
                it("should decrypt a password", function() {
                    var iv = 'vNtIgxV4kh0XHSa9ZJxkSg==';
                    var community = encryption.encrypt('public', iv);
                    var callback = function() {};
                    callback.call = sinon.stub();
                    var data = {
                        community: community
                    };
                    job._runSnmpCommandCallback(callback, data);
                    expect(callback.call.firstCall.args[1]).to.deep.equal({
                        community: 'public'
                    });
                });

                it("should convert a host mac address to an IP", function() {
                    this.sandbox.stub(lookup, 'macAddressToIp');
                    lookup.macAddressToIp.resolves({
                        host: '10.1.1.2'
                    });
                    var callback = function() {};
                    callback.call = sinon.stub();
                    var data = {
                        host: '7a:c0:7a:c0:be:ef'
                    };
                    job._runSnmpCommandCallback(callback, data);

                    process.nextTick(function() {
                        expect(callback.call.firstCall.args[1]).to.deep.equal({
                            host: '10.1.1.2'
                        });
                    });
                });
            });

            describe("Ansible run command", function() {
                it("should drop invalid data", function() {
                    var callback = function() {};
                    callback.call = sinon.stub();
                    job._ansibleCommandCallback(callback, undefined);
                    expect(callback.call).to.not.have.been.called;
                });
            });

        });
    });
});
