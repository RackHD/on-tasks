// Copyright 2015, Renasar Technologies Inc.
/* jshint node:true */

'use strict';

var events = require('events');

var injector;
var Task;
var taskData;
var noopTask;
var baseNoopTask;
var noopDefinition;

function literalCompare(objA, objB) {
    _.forEach(objA, function(v, k) {
        if (typeof v === 'object' && !(v instanceof Date)) {
            literalCompare(v, objB[k]);
        } else {
            expect(v).to.deep.equal(objB[k]);
        }
    });
}

// The only values currently that won't compare accurately from JSON to
// object are Date objects, so do some manual conversion there.
function deserializeJson(json) {
    _.forEach(json.stats, function(v, k) {
        if (v) {
            json.stats[k] = new Date(v);
        }
    });
}

before('task-spec before', function() {
    this.timeout(5000);
    var taskModule = helper.require('/index');
    injector = helper.baseInjector.createChild(
        _.flatten([
            taskModule.injectables,
            dihelper.simpleWrapper({}, 'Protocol.Events'),
            dihelper.simpleWrapper({}, 'Protocol.Task')
        ])
    );
    var Logger = injector.get('Logger');
    Logger.prototype.log = sinon.spy();
    Task = injector.get('Task.Task');
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

describe("Task", function () {
    it("should create subscriptions on start", function() {
        var task = Task.create(noopDefinition, {}, {});
        var taskProtocol = injector.get('Protocol.Task');
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

            expect(task).to.have.property('serialize');
            expect(function() {
                taskJson = JSON.stringify(task);
            }).to.not.throw(Error);

            var parsed = JSON.parse(taskJson);

            deserializeJson(parsed);

            literalCompare(task, parsed);
        });
    });

    describe("cancellation", function() {
        var task;
        var eventsProtocol;
        var subscriptionStub;
        var cancelSpy;

        before('task-spec cancellation before', function() {
            eventsProtocol = injector.get('Protocol.Events');
            eventsProtocol.publishTaskFinished = sinon.stub().resolves();
            subscriptionStub = { dispose: sinon.stub().resolves() };
        });

        beforeEach('task-spec-cancellation beforeEach', function() {
            subscriptionStub.dispose.reset();
            eventsProtocol.publishTaskFinished.reset();

            task = Task.create(noopDefinition, {}, {});
            task.subscriptions = {
                run: subscriptionStub,
                cancel: subscriptionStub
            };
            cancelSpy = sinon.spy(task, 'cancel');
        });

        it("should cancel a task", function() {
            return task.cancel()
            .then(function() {
                expect(cancelSpy).to.have.been.calledOnce;
                expect(task.state).to.equal('cancelled');
                expect(eventsProtocol.publishTaskFinished).to.have.been.calledWith(task.instanceId);
                expect(subscriptionStub.dispose).to.have.been.calledTwice;
            });
        });

        it("should cancel a task with an error", function() {
            var error = new Error('test cancel error');
            return task.cancel(error)
            .then(function() {
                expect(cancelSpy).to.have.been.calledOnce;
                expect(task.error).to.equal(error);
                expect(task.state).to.equal('cancelled');
                expect(eventsProtocol.publishTaskFinished).to.have.been.calledWith(task.instanceId);
                expect(subscriptionStub.dispose).to.have.been.calledTwice;
            });
        });

        describe("of job", function() {
            var jobCancelStub = sinon.stub();

            beforeEach('task-spec-job-cancellation beforeEach', function() {
                jobCancelStub.reset();

                task.job = new events.EventEmitter();
                task.job.cancel = function(error) {
                    jobCancelStub(error);
                    task.job.emit('done');
                };
                task.job.run = sinon.stub();
                task.instantiateJob = sinon.stub();

                task.run();
            });

            it("should cancel a job and publish finished on 'done' emitted from job", function() {
                return task.cancel()
                .then(function() {
                    expect(cancelSpy).to.have.been.calledOnce;
                    expect(jobCancelStub).to.have.been.calledOnce;
                    // eventsProtocol.publishTaskFinished is either called
                    // from task.cancel() if there is no job (on pre-job
                    // instantiation failure), or in this case,
                    // from job.on('done') when 'done' is emitted on job.cancel().
                    expect(eventsProtocol.publishTaskFinished)
                        .to.have.been.calledWith(task.instanceId);
                });
            });

            it("should cancel a job with an error", function() {
                var error = new Error('test cancel job error');
                return task.cancel(error)
                .then(function() {
                    expect(cancelSpy).to.have.been.calledOnce;
                    expect(jobCancelStub).to.have.been.calledWith(error);
                });
            });

            it("should cancel on failure to instantiate a job", function() {
                var error = new Error('test instantiate job error');
                task.job = undefined;
                task.instantiateJob = sinon.stub().throws(error);

                return task.run()
                .then(function() {
                    expect(cancelSpy).to.have.been.calledOnce;
                    expect(task.error).to.equal(error);
                });
            });
        });

        it("should cancel on receipt of a cancel message from AMQP", function(done) {
            var protocolStub = new events.EventEmitter();
            var taskProtocol = injector.get('Protocol.Task');
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
                    expect(cancelSpy).to.have.been.calledOnce;
                    done();
                });
            });
        });
    });
});
