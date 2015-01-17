// Copyright 2014, Renasar Technologies Inc.
/* jshint: node:true */
'use strict';

var di = require('di');

module.exports = factory;
di.annotate(factory, new di.Provide('Task.Task'));
    di.annotate(factory,
    new di.Inject(
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
function factory(Logger, assert, uuid, Q, _, injector) {
    var logger = Logger.initialize(factory);

    /**
     *
     * @param taskGraph
     * @param optionOverrides
     * @returns {factory.Task}
     * @constructor
     */
    function Task(definition, taskOverrides) {
        if (!(this instanceof Task)) {
            return new Task(definition);
        }

        assert.object(definition);
        assert.string(definition.friendlyName);
        assert.string(definition.implementsTask);
        assert.object(definition.options);
        assert.object(definition.properties);

        this.definition = definition;
        // take any overrides and apply them to our set of defaults
        var optionDefaults = {
            name: 'Default Task Name'
        };
        this.options = _.defaults(definition.options || {}, optionDefaults);

        this.id = uuid.v4();

        // run state related properties
        this.cancelled = false;
        this.retriesAttempted = 0;
        taskOverrides = taskOverrides || {};
        this.retriesAllowed = taskOverrides.retriesAllowed || 5;

        this.instanceId = taskOverrides.instanceId || uuid();
        this.name = taskOverrides.name || this.instanceId;
        this.waitingOn = taskOverrides.waitingOn || [];
        this.status = 'waiting';
        this.tags = [];


        // this.work = task;
        this.dependents = [];
        this.outcome = 'pending';
        this._result = Q.defer();
        this.result = this._result.promise;
        this.stats = {
            created: new Date(),
            started: null,
            completed: null
        };

        // used for logging to ensure all log lines allow tracing work
        // to this specific instance of the run
        this.taskId = uuid.v4();

        // human readable name
        this.friendlyName = this.taskId;

        // tags for categorization and hinting functionality
        this.properties = definition.properties;

        this.context = {
            // starts as false, this is changed to true if the job is cancelled
            // or times out - this is the place to check inside a loop whether
            // to continue to do work.
            canceled: false,
            local: {
                stats: {}
            },
            parent: {}
        };

        // internal representation of deferred object
        this._complete = Q.defer();

        // promise for when the Task enters into a final state
        this.complete = this._complete.promise;

        // state of the current object
        this.state = 'pending';

        // hint to whatever is running the task when it is successful
        this.successStates = ['success'];

        // hint to whatever is running the task when it has failed
        this.failedStates = ['failed', 'timeout'];

        // default timeout that kills the task if it runs longer than this
        // -1 means wait forever, specified in milliseconds.  Will fail job
        // with state 'timeout'.
        this.timeOut = 5000;

        return this;
    }

    Task.prototype.work = function () {

    };

    //when someone finsihes a http requests for a specific file from a specifc ip
    Task.prototype.changeState = function (state) {
        state;
    };

    Task.prototype.waitOn = function (waitObject) {
        assert.equal(this.status, 'waiting', 'only newly initialized or still ' +
        'waiting tasks can add additional tasks to wait on');
        this.waitingOn.push(waitObject);
        return this;
    };

    Task.prototype.run = function (graph) {
        graph;
        // can assert/validate that when we are run, all of the tasks we are
        // waiting on can be confirmed as being in a state we accept as satisfying
        // our wait.  this allows us to ensure that we do not start before anything

        //graph is the context it is running in, graph contains information and
        //functions that allow this instance of a task runner to communicate the
        //success or failure of this function
    };

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

    Task.create = function create(definition, taskOverrides) {
        return new Task(definition, taskOverrides);
    };

    Task.createRegistryObject = function (definition) {
        var _definition = _.cloneDeep(definition);
        return {
            create: function(definitionOverrides, taskOverrides) {
                var _definition = definition;
                var options = _.defaults(_definition, definitionOverrides);
                return Task.create(options, taskOverrides);
            },
            definition: Object.freeze(_definition)
        };
    };

    return Task;
}
