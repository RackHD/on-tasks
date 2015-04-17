// Copyright 2014, Renasar Technologies Inc.
/* jshint: node:true */
'use strict';

var di = require('di');

module.exports = factory;
di.annotate(factory, new di.Provide('Task.Task'));
    di.annotate(factory,
    new di.Inject(
        'Protocol.Task',
        'Protocol.Events',
        'Logger',
        'Assert',
        'Errors',
        'Constants',
        'uuid',
        'Promise',
        '_',
        di.Injector
    )
);

/**
 * Injectable wrapper for dependencies
 * @param logger
 */
function factory(taskProtocol, eventsProtocol, Logger, assert, Errors, Constants,
        uuid, Promise, _, injector) {

    var TaskStates = Constants.TaskStates;
    var logger = Logger.initialize(factory);

    /**
     *
     * @param taskGraph
     * @param optionOverrides
     * @returns {factory.Task}
     * @constructor
     */
    function Task(definition, taskOverrides, context) {
        var self = this;

        assert.object(definition, 'Task definition data');
        assert.string(definition.friendlyName, 'Task definition friendly name');
        assert.string(definition.implementsTask, 'Task definition implementsTask');
        assert.string(definition.runJob, 'Task definition job name');
        assert.object(definition.options, 'Task definition option');
        assert.object(definition.properties, 'Task definition properties');
        assert.object(context, 'Task shared context object');

        self.definition = _.cloneDeep(definition);
        self.options = self.definition.options;

        // run state related properties
        self.cancelled = false;
        self.retriesAttempted = 0;
        taskOverrides = taskOverrides || {};
        self.retriesAllowed = taskOverrides.retriesAllowed || 5;

        self.instanceId = taskOverrides.instanceId || uuid.v4();
        self.name = taskOverrides.name || self.definition.injectableName;
        self.friendlyName = taskOverrides.friendlyName || self.definition.friendlyName;
        self.waitingOn = taskOverrides.waitingOn || [];
        self.ignoreFailure = taskOverrides.ignoreFailure || false;
        self.tags = [];
        self.subscriptions = {};

        // tags for categorization and hinting functionality
        self.properties = definition.properties;

        self.context = {};
        // State bag shared throughout tasks in a TaskGraph
        self.parentContext = context;
        self.parentContext[self.instanceId] = self.context;

        // state of the current object
        self.state = TaskStates.Pending;

        // hint to whatever is running the task when it is successful
        self.successStates = [TaskStates.Succeeded];
        // hint to whatever is running the task when it has failed
        self.failedStates = [TaskStates.Failed, TaskStates.Timeout, TaskStates.Cancelled];

        return self;
    }

    Task.prototype.instantiateJob = function() {
        assert.string(this.definition.runJob, 'Task.definition.runJob injector string');
        // This should already have been validated to exist
        var Job = injector.get(this.definition.runJob);
        this.job = new Job(this.options, this.parentContext, this.instanceId);
        assert.func(this.job.run, "Task Job run method");
        assert.func(this.job.cancel, "Task Job cancel method");
    };

    Task.prototype.publishFinished = function() {
        var self = this;
        return eventsProtocol.publishTaskFinished(self.instanceId)
        .catch(function(error) {
            logger.error("Error publishing Task finished event.", {
                error: error,
                taskId: self.instanceId,
                taskName: self.name,
                job: self.definition.runJob
            });
        });
    };

    Task.prototype._run = function () {
        var self = this;

        logger.info("Running task job.", {
            taskId: self.instanceId,
            name: self.definition.friendlyName,
            job: self.definition.runJob
        });

        // return for test
        return self.job.run()
        .then(function() {
            self.state = TaskStates.Succeeded;
        })
        .catch(Errors.TaskCancellationError, function(e) {
            self.state = TaskStates.Cancelled;
            self.error = e;
        })
        .catch(function(e) {
            self.state = TaskStates.Failed;
            self.error = e;
        })
        .finally(function() {
            return self.finish();
        });
    };

    Task.prototype.run = function() {
        if (this.state === TaskStates.Running) {
            return Promise.resolve();
        }
        this.state = TaskStates.Running;

        try {
            this.instantiateJob();
        } catch (e) {
            this.state = TaskStates.Failed;
            this.error = e;
            return this.finish();
        }

        return this._run();
    };

    Task.prototype.finish = function() {
        var self = this;
        // Because we're in a Promise.finally block, make sure any
        // exceptions are caught within these functions and
        // not bubbled up.
        return self.publishFinished()
        .then(function() {
            return self.cleanup();
        });
    };

    Task.prototype.cleanup = function() {
        var self = this;

        return Promise.all(_.map(self.subscriptions, function(subscription) {
            return subscription.dispose();
        }))
        .catch(function(error) {
            logger.error("Error cleaning up Task job.", {
                error: error,
                taskId: self.instanceId,
                taskName: self.name,
                job: self.definition.runJob
            });
        });
    };

    Task.prototype.cancel = function(error) {
        if (this.state === TaskStates.Pending) {
            // This block handles cancellation before run() has
            // been called (i.e. the task has been created, but not
            // yet scheduled to run by the scheduler via taskProtocol.subscribeRun
            this.state = TaskStates.Cancelled;
            if (error) {
                this.error = error;
            }
            return this.finish();
        } else if (this.state !== TaskStates.Cancelled) {
            // Task cancellation is passed down to the job first
            // and then bubbled up into the promise chain
            // created in this.run()
            if (error) {
                this.error = error;
            }
            this.job.cancel(error);
        }
    };

    Task.prototype.start = function start() {
        var self = this;
        return Promise.all([
            taskProtocol.subscribeRun(self.instanceId, self.run.bind(self)),
            taskProtocol.subscribeCancel(self.instanceId, self.cancel.bind(self))
        ]).spread(function(runSubscription, cancelSubscription) {
            self.subscriptions.run = runSubscription;
            self.subscriptions.cancel = cancelSubscription;
            logger.info("Starting task.", {
                taskId: self.instanceId,
                name: self.definition.friendlyName
            });
        }).catch(function(error) {
            logger.error("Error starting Task subscriptions.", {
                error: error,
                taskId: self.instanceId,
                taskName: self.name
            });
        });
    };

    // enables JSON.stringify(this)
    Task.prototype.toJSON = function toJSON() {
        return this.serialize();
    };

    Task.prototype.serialize = function serialize() {
        var redactKeys = ['subscriptions', '_events', '_cancellable'];
        var obj = _.transform(this, function(result, v, k) {
            if (!_.contains(redactKeys, k)) {
                result[k] = v;
            }
        }, {});

        if (this.job) {
            obj.job = this.job.serialize();
        }

        return obj;
    };

    Task.create = function create(definition, taskOverrides, context) {
        var task = new Task(definition, taskOverrides, context);
        return task;
    };

    Task.createRegistryObject = function (definition) {
        var _definition = _.cloneDeep(definition);
        return {
            create: function(definitionOverrides, taskOverrides, context) {
                var instanceDefinition = _.defaults(definitionOverrides, _definition);
                return Task.create(instanceDefinition, taskOverrides, context);
            },
            definition: _definition
        };
    };

    return Task;
}
