// Copyright 2015, Renasar Technologies Inc.
/* jshint node:true */

'use strict';

describe("Task", function () {
    var events = require('events');
    var Task;
    var taskData;
    var noopTask;
    var baseNoopTask;
    var noopDefinition;
    var Promise;

    function literalCompare(objA, objB) {
        _.forEach(objA, function(v, k) {
            if (_.contains(['subscriptions' ,'_events'], k)) {
                return;
            }
            if (typeof v === 'object') {
                literalCompare(v, objB[k]);
            } else {
                expect(v).to.deep.equal(objB[k]);
            }
        });
    }

    before('task-spec before', function() {
        this.timeout(5000);
        var taskModule = helper.require('/index');
        helper.setupInjector([
            taskModule.injectables,
            helper.di.simpleWrapper({}, 'Protocol.Events'),
            helper.di.simpleWrapper({}, 'Protocol.Task')
        ]);
        Promise = helper.injector.get('Promise');
        var Logger = helper.injector.get('Logger');
        Logger.prototype.log = sinon.spy();
        Task = helper.injector.get('Task.Task');
        taskData = taskModule.taskData;

        _.forEach(taskData, function(definition) {
            if (definition.injectableName === 'Task.noop') {
                noopTask = definition;
            } else if (definition.injectableName === 'Task.Base.noop') {
                baseNoopTask = definition;
            }
        });

        expect(noopTask).to.not.be.empty;
        expect(baseNoopTask).to.not.be.empty;

        noopDefinition = _.merge(noopTask, baseNoopTask);
    });

    it("should create subscriptions on start", function() {
        var task = Task.create(noopDefinition, {}, {});
        var taskProtocol = helper.injector.get('Protocol.Task');
        taskProtocol.subscribeRun = sinon.stub().resolves('test run subscription');
        taskProtocol.subscribeCancel = sinon.stub().resolves('test cancel subscription');

        return task.start()
        .then(function() {
            expect(task.subscriptions.run).to.equal('test run subscription');
            expect(task.subscriptions.cancel).to.equal('test cancel subscription');
        });
    });

    describe("serialization", function() {
        it("should serialize to a JSON object", function() {
            var task = Task.create(noopDefinition, {}, {});
            expect(task).to.have.property('serialize');

            literalCompare(task, task.serialize());
        });

        it("should serialize to a JSON string", function() {
            var taskJson;
            var task = Task.create(noopDefinition, {}, {});

            expect(task).to.have.property('serialize').that.is.a('function');
            expect(function() {
                taskJson = JSON.stringify(task);
            }).to.not.throw(Error);

            var parsed = JSON.parse(taskJson);

            // Re-add properties removed from the serialized object
            // just so our deep.equal comparison is easier.
            parsed.subscriptions = task.subscriptions;
            parsed._jobPromise = task._jobPromise;
            parsed._resolver = task._resolver;

            //expect(task).to.deep.equal(parsed);
            literalCompare(task, parsed);
        });

        it("should serialize a job for an instance", function() {
            var task = Task.create(noopDefinition, {}, {});
            task.instantiateJob();
            expect(task.serialize().job).to.deep.equal(task.job.serialize());
        });
    });

    describe("cancellation/completion", function() {
        var task;
        var eventsProtocol;
        var subscriptionStub;
        var Errors;

        before('task-spec cancellation before', function() {
            eventsProtocol = helper.injector.get('Protocol.Events');
            eventsProtocol.publishTaskFinished = sinon.stub().resolves();
            subscriptionStub = { dispose: sinon.stub().resolves() };
            Errors = helper.injector.get('Errors');
        });

        beforeEach('task-spec-cancellation beforeEach', function() {
            subscriptionStub.dispose.reset();
            eventsProtocol.publishTaskFinished.reset();

            task = Task.create(noopDefinition, {}, {});
            task.subscriptions = {
                run: subscriptionStub,
                cancel: subscriptionStub
            };
            sinon.spy(task, 'cancel');
            sinon.spy(task, 'finish');
        });

        describe("of task", function() {
            it("should clean up resources on finish", function() {
                sinon.spy(task, 'cleanup');
                return task.finish()
                .then(function() {
                    expect(task.cleanup).to.have.been.calledOnce;
                    expect(eventsProtocol.publishTaskFinished)
                        .to.have.been.calledWith(task.instanceId);
                });
            });

            it("should cancel before it has been set to run", function(done) {
                var error = new Errors.TaskCancellationError('test error');
                task.cancel(error);

                process.nextTick(function() {
                    try {
                        expect(task.finish).to.have.been.calledOnce;
                        expect(task.state).to.equal('cancelled');
                        expect(task.error).to.equal(error);
                        expect(subscriptionStub.dispose).to.have.been.calledTwice;
                        done();
                    } catch (e) {
                        done(e);
                    }
                });
            });

            it("should cancel", function() {
                task.instantiateJob();
                task.state = 'running';

                sinon.spy(task.job, 'cancel');
                task.job._run = function() {
                    return Promise.delay(100);
                };

                var error = new Errors.TaskCancellationError('test error');
                task.cancel(error);

                return task._run()
                .then(function() {
                    expect(task.finish).to.have.been.calledOnce;
                    expect(task.state).to.equal('cancelled');
                    expect(task.error).to.equal(error);
                    expect(task.job.cancel).to.have.been.calledOnce;
                    expect(subscriptionStub.dispose).to.have.been.calledTwice;
                });
            });

            it("should cancel on failure to instantiate a job", function() {
                var error = new Error('test instantiate job error');
                task.job = undefined;
                task.instantiateJob = sinon.stub().throws(error);

                return task.run()
                .then(function() {
                    expect(task.finish).to.have.been.calledOnce;
                    expect(task.state).to.equal('failed');
                    expect(task.error).to.equal(error);
                });
            });
        });

        describe("of job", function() {
            beforeEach('task-spec-job-cancellation beforeEach', function() {
                task.instantiateJob();
                task.state = 'running';
                sinon.spy(task.job, 'cancel');
                sinon.spy(task.job, '_done');
                task.job._run = function() {
                    return Promise.delay(100);
                };
            });

            it("should cancel a job", function() {
                var error = new Errors.TaskCancellationError('test error');
                task.cancel(error);

                return task._run()
                .then(function() {
                    expect(task.job.cancel).to.have.been.calledOnce;
                    expect(task.job.cancel).to.have.been.calledWith(error);
                    expect(task.job._done).to.have.been.calledOnce;
                    expect(task.job._done).to.have.been.calledWith(error);
                });
            });

            it("should manage subscription resource creation and deletion", function() {
                task.job.context.target = 'testtarget';
                task.job._subscribeActiveTaskExists = sinon.stub().resolves();
                var jobSubscriptionStub = { dispose: sinon.stub().resolves() };
                task.job.subscriptions = [
                    jobSubscriptionStub, jobSubscriptionStub, jobSubscriptionStub
                ];

                task.cancel(new Errors.TaskCancellationError('test error'));

                return task._run()
                .then(function() {
                    expect(task.job._subscribeActiveTaskExists).to.have.been.calledOnce;
                    expect(jobSubscriptionStub.dispose).to.have.been.calledThrice;
                });
            });
        });

        it("should cancel on receipt of a cancel message from AMQP", function(done) {
            var protocolStub = new events.EventEmitter();
            var taskProtocol = helper.injector.get('Protocol.Task');
            taskProtocol.subscribeRun = sinon.stub().resolves(subscriptionStub);
            taskProtocol.subscribeCancel = function(taskId, callback) {
                protocolStub.on('cancel.' + taskId, function() {
                    callback.call(task);
                });
                return Q.resolve(subscriptionStub);
            };

            return task.start()
            .then(function() {
                protocolStub.emit('cancel.' + task.instanceId);
                process.nextTick(function() {
                    expect(task.cancel).to.have.been.calledOnce;
                    done();
                });
            });
        });
    });
});
