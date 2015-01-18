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

        assert.object(definition, 'Task definition data');
        assert.string(definition.friendlyName, 'Task definition friendly name');
        assert.string(definition.implementsTask, 'Task definition implementsTask');
        assert.string(definition.runJob, 'Task definition job name');
        assert.object(definition.options, 'Task definition option');
        assert.object(definition.properties, 'Task definition properties');

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

        // state of the current object
        this.state = 'pending';

        // hint to whatever is running the task when it is successful
        this.successStates = ['succeeded'];

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

    Task.prototype.run = function () {
        var self = this;
        assert.string(this.options.runJob, 'Task.options.runJob injector string');
        self.job = injector.get(this.options.runJob);
        self.state = 'started';
        self.job().then(function() {
            self.outcome = 'succeeded';
            self._result.resolve();
        }).catch(function(error) {
            self.outcome = 'failed';
            self.error = error;
            self._result.reject(error);
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

    Task.create = function create(definition, taskOverrides) {
        return new Task(definition, taskOverrides);
    };

    Task.createRegistryObject = function (definition) {
        var _definition = _.cloneDeep(definition);
        return {
            create: function(definitionOverrides, taskOverrides) {
                var _definition = _.cloneDeep(definition);
                var options = _.defaults(_definition, definitionOverrides);
                return Task.create(options, taskOverrides);
            },
            definition: Object.freeze(_definition)
        };
    };

    return Task;
}
