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
        'uuid',
        'Q',
        '_',
        di.Injector
    )
);

/**
 * Injectable wrapper for dependencies
 * @param logger
 */
function factory(taskProtocol, eventsProtocol, Logger, assert, uuid, Q, _, injector) {
    var logger = Logger.initialize(factory);

    /**
     *
     * @param taskGraph
     * @param optionOverrides
     * @returns {factory.Task}
     * @constructor
     */
    function Task(definition, taskOverrides, context) {
        assert.object(definition, 'Task definition data');
        assert.string(definition.friendlyName, 'Task definition friendly name');
        assert.string(definition.implementsTask, 'Task definition implementsTask');
        assert.string(definition.runJob, 'Task definition job name');
        assert.object(definition.options, 'Task definition option');
        assert.object(definition.properties, 'Task definition properties');
        assert.object(context, 'Task shared context object');

        this.definition = _.cloneDeep(definition);
        this.options = this.definition.options;

        // run state related properties
        this.cancelled = false;
        this.retriesAttempted = 0;
        taskOverrides = taskOverrides || {};
        this.retriesAllowed = taskOverrides.retriesAllowed || 5;

        this.instanceId = taskOverrides.instanceId || uuid.v4();
        this.name = taskOverrides.name || this.definition.injectableName;
        this.friendlyName = taskOverrides.friendlyName || this.definition.friendlyName;
        this.waitingOn = taskOverrides.waitingOn || [];
        this.ignoreFailure = taskOverrides.ignoreFailure || false;
        this.tags = [];
        this.subscriptions = {};


        // this.work = task;
        this.dependents = [];
        this.stats = {
            created: new Date(),
            started: null,
            completed: null
        };

        // tags for categorization and hinting functionality
        this.properties = definition.properties;

        this.context = {
            // starts as false, this is changed to true if the job is cancelled
            // or times out - this is the place to check inside a loop whether
            // to continue to do work.
            cancelled: false,
            local: {
                stats: {}
            },
            parent: {}
        };
        // State bag shared throughout tasks in a TaskGraph
        this.parentContext = context;
        this.parentContext[this.instanceId] = this.context;

        // state of the current object
        this.state = 'pending';

        // hint to whatever is running the task when it is successful
        this.successStates = ['succeeded'];

        // hint to whatever is running the task when it has failed
        this.failedStates = ['failed', 'timeout', 'cancelled'];

        return this;
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

    Task.prototype.run = function () {
        var self = this;
        self.state = 'running';
        try {
            self.instantiateJob();
        } catch (e) {
            return self.cancel(e);
        }
        logger.info("Running task job.", {
            taskId: self.instanceId,
            name: self.definition.friendlyName,
            job: self.definition.runJob
        });
        self.job.on('done', function(error) {
            if (error) {
                if (self.state === 'running') {
                    self.state = 'failed';
                    self.error = error;
                } else {
                    logger.warning("Task job failed after task had already completed.", {
                        error: error,
                        taskId: self.instanceId,
                        taskName: self.name
                    });
                }
            } else {
                if (self.state === 'running') {
                    self.state = 'succeeded';
                } else {
                    logger.warning("Task job succeeded after task had already completed.", {
                        taskId: self.instanceId,
                        taskName: self.name
                    });
                }
            }
            self.publishFinished();
        });

        self.job.run();
    };

    Task.prototype.cancel = function(error) {
        var self = this;
        self.state = 'cancelled';
        self.error = error;
        return Q.resolve()
        .then(function() {
            if (self.job) {
                // job cancel callback will publish finished instead of below
                return Q.resolve(self.job.cancel(error));
            } else {
                return self.publishFinished();
            }
        }).then(function() {
            return Q.all(_.map(self.subscriptions, function(subscription) {
                return subscription.dispose();
            }));
        }).catch(function(error) {
            logger.error("Error canceling Task job.", {
                error: error,
                taskId: self.instanceId,
                taskName: self.name,
                job: self.definition.runJob
            });
        });
    };

    Task.prototype.start = function start() {
        var self = this;
        return Q.all([
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
        var json = _.cloneDeep(_(this).value());
        if (this.job) {
            json.job = this.job.serialize();
        }
        delete json.subscriptions;
        return json;
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
