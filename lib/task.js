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
        if (!(this instanceof Task)) {
            return new Task(definition);
        }

        assert.object(definition, 'Task definition data');
        assert.string(definition.friendlyName, 'Task definition friendly name');
        assert.string(definition.implementsTask, 'Task definition implementsTask');
        assert.string(definition.runJob, 'Task definition job name');
        assert.object(definition.options, 'Task definition option');
        assert.object(definition.properties, 'Task definition properties');
        assert.object(context, 'Task shared context object');

        this.definition = Object.freeze(_.cloneDeep(definition));
        var optionDefaults = {};
        this.options = _.defaults(definition, optionDefaults);

        this.id = uuid.v4();

        // run state related properties
        this.cancelled = false;
        this.retriesAttempted = 0;
        taskOverrides = taskOverrides || {};
        this.retriesAllowed = taskOverrides.retriesAllowed || 5;

        this.instanceId = taskOverrides.instanceId || uuid();
        this.name = taskOverrides.name || this.options.injectableName;
        this.friendlyName = taskOverrides.friendlyName || this.options.friendlyName;
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
        assert.string(this.options.runJob, 'Task.options.runJob injector string');
        // This should already have been validated to exist
        var Job = injector.get(this.options.runJob);
        this.job = new Job(this.options.options, this.parentContext, this.instanceId);
        assert.func(this.job.run, "Task Job run method");
        assert.func(this.job.cancel, "Task Job cancel method");
    };

    Task.prototype.run = function () {
        var self = this;
        self.state = 'running';
        self.instantiateJob();
        logger.info("Running task job.", {
            taskId: self.instanceId,
            name: self.options.friendlyName,
            job: self.options.runJob
        });
        self.job.on('done', function() {
            if (self.state === 'running') {
                self.state = 'succeeded';
            } else {
                logger.warning("Task job succeeded after task had already completed.", {
                    taskId: self.instanceId,
                    taskName: self.name
                });
            }
            eventsProtocol.publishTaskFinished(self.instanceId);
        });
        self.job.on('fail', function(error) {
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
            eventsProtocol.publishTaskFinished(self.instanceId);
        });

        self.job.run();
    };

    Task.prototype.cancel = function() {
        var self = this;
        if (self.job && _.isFunction(self.job.cancel)) {
            self.job.cancel();
        }
        self.state = 'cancelled';
        return Q.all(_.map(self.subscriptions, function(subscription) {
            return subscription.dispose();
        })).catch(function(error) {
            logger.error("Error canceling Task job.", {
                error: error,
                taskId: self.instanceId,
                taskName: self.name,
                job: self.options.runJob
            });
        });
    };

    // TODO: move this into renasar-taskgraph
    /*
    Task.prototype.validate = function() {
        var self = this;
        var taskInterface;
        var job;

        try {
            taskInterface = injector.get(this.definition.implementsTask);
        } catch (e) {
            logger.error("Caught error loading task: ", {
                error: e,
                taskId: this.id
            });
            throw new Error("Task implements " + this.definition.implementsTask +
                    " but it could not be loaded.");
        }

        _.forEach(taskInterface.requiredOptions, function(op) {
            if (!_.has(self.options, op)) {
                throw new Error("Missing required option: " + op);
            }
        });

        try {
            job = injector.get(taskInterface.runJob);
        } catch (e) {
            logger.error("Caught error loading task: ", {
                error: e,
                taskId: this.id
            });
            throw new Error("Task runs job " + taskInterface.runJob +
                    " but it could not be loaded.");
        }
    };
    */

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
                name: self.options.friendlyName
            });
        }).catch(function(error) {
            logger.error("Error starting Task subscriptions.", {
                error: error,
                taskId: self.instanceId,
                taskName: self.name
            });
        });
    };

    Task.create = function create(definition, taskOverrides, context) {
        var task = new Task(definition, taskOverrides, context);
        return task;
    };

    Task.createRegistryObject = function (definition) {
        var _definition = _.cloneDeep(definition);
        return {
            create: function(definitionOverrides, taskOverrides, context) {
                var _definition = _.cloneDeep(definition);
                var options = _.defaults(_definition, definitionOverrides);
                return Task.create(options, taskOverrides, context);
            },
            definition: Object.freeze(_definition)
        };
    };

    return Task;
}
