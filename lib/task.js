// Copyright 2015, EMC, Inc.

'use strict';

var di = require('di');

module.exports = factory;
di.annotate(factory, new di.Provide('Task.Task'));
di.annotate(factory,
    new di.Inject(
        'Protocol.Task',
        'Protocol.Events',
        'Services.Configuration',
        'JobUtils.CatalogSearchHelpers',
        'Logger',
        'Assert',
        'Errors',
        'Constants',
        'uuid',
        'Hogan',
        'Promise',
        'Rx',
        '_',
        di.Injector
    )
);

/**
 * Injectable wrapper for dependencies
 * @param logger
 */
function factory(
    taskProtocol,
    eventsProtocol,
    configuration,
    catalogSearch,
    Logger,
    assert,
    Errors,
    Constants,
    uuid,
    Hogan,
    Promise,
    Rx,
    _,
    injector
) {

    var TaskStates = Constants.TaskStates;
    var logger = Logger.initialize(factory);

    // Define task states we should defer rendering until for certain keys
    var renderRules = {
        'context': TaskStates.Running
        // '#user': Constants.TaskStates.Running  // <- example future usage
    };
    var DeferredString = 'DEFER';

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

        // run state related properties
        self.cancelled = false;
        taskOverrides = taskOverrides || {};

        self.instanceId = taskOverrides.instanceId || uuid.v4();
        // Add convenience nodeId attribute to be used for rendering some task data option values
        if (_.has(context, 'target')) {
            self.nodeId = context.target;
        }
        self.name = taskOverrides.name || self.definition.injectableName;
        self.friendlyName = taskOverrides.friendlyName || self.definition.friendlyName;
        self.waitingOn = taskOverrides.waitingOn || [];
        self.ignoreFailure = taskOverrides.ignoreFailure || false;

        // tags for categorization and hinting functionality
        self.properties = definition.properties;

        // State bag shared throughout tasks in a TaskGraph
        self.context = context;

        // state of the current object
        self.state = TaskStates.Pending;

        // hint to whatever is running the task when it is successful
        self.successStates = [TaskStates.Succeeded];
        // hint to whatever is running the task when it has failed
        self.failedStates = [TaskStates.Failed, TaskStates.Timeout, TaskStates.Cancelled];

        self.renderContext = {
            server: Task.configCache,
            api: {
                server:
                    'http://' +
                    Task.configCache.apiServerAddress + ':' + Task.configCache.apiServerPort
            },
            task: self,
            options: self.definition.options,
            context: self.context
        };
        self.renderContext.api.base = self.renderContext.api.server + '/api/current';
        self.renderContext.api.files = self.renderContext.api.base + '/files';
        self.renderContext.api.nodes = self.renderContext.api.base + '/nodes';

        self.renderOwnOptions(_.cloneDeep(self.definition.options));

        return self;
    }

    Task.prototype.isDeferredRender = function(renderKey) {
        if (_.has(renderRules, renderKey)) {
            return renderRules[renderKey] !== this.state;
        } else {
            return false;
        }
    };

    Task.prototype.renderString = function(str, context, depth, maxDepth) {
        var self = this;

        if (depth > maxDepth) {
            throw new Errors.TemplateRenderError("Exceeded max depth rendering string: " + str);
        }

        var deferredRender;
        var rendered;

        // Support OR syntax: {{ options.value | options.backupValue | default }}
        // ^^ Will return "default" if options.value and options.backupValue do not exist
        _.some(str.split(/[\s\n]?\|+[\s\n]?/), function(item) {
            // If item is a string that should not be rendered yet, defer rendering
            // until the next render stage
            if (self.isDeferredRender(item.split('.')[0], self.state)) {
                deferredRender = true;
            }
            rendered = item.indexOf('.') > -1 ? catalogSearch.getPath(context, item) : item;
            return rendered;
        });

        if (deferredRender) {
            return DeferredString;
        } else if (!rendered) {
            throw new Errors.TemplateRenderError("Value does not exist for " + str);
        }
        // Check if our rendered string itself needs to be rendered (i.e. the rendered
        // template is itself another template that needs to be rendered)
        var partialRender = _.some(self.parse(rendered), function(item) {
            return item.tag === '_v';
        });
        // NOTE (benbp): this is a non-optimal algorithm. Since we aren't caching nested
        // render results, we may end up rendering some templates multiple times.
        // I highly doubt this will cause any bottlenecks given the small scale at which
        // we are rendering, so it's not worth the extra effort at this time.
        if (partialRender) {
            return self.render(rendered, context, depth + 1);
        } else {
            return rendered;
        }
    };

    Task.prototype.parse = function(source) {
        return Hogan.parse(Hogan.scan(source));
    };

    Task.prototype.renderComplex = function(source, context) {
        return Hogan.compile(source).render(context);
    };

    Task.prototype.render = function(source, context, depth) {
        var self = this;

        var parsed = self.parse(source);
        // use original hogan render while source contains complex logic like iteration
        var complexTemplate = _.some(parsed, function(item) {
            return item.tag !== '_t' && item.tag !== '_v';
        });
        if (complexTemplate) {
            return self.renderComplex(source, context);
        }

        return _.map(parsed, function(item) {
            // Read Hogan parse tree objects
            // _t === simple text
            // _v === value to be rendered
            if (item.tag === '_t') {
                return _.values(item.text).join('');
            } else if (item.tag === '_v') {
                depth = _.isNumber(depth) ? depth : 0;
                var rendered = self.renderString(item.n, context, depth, 50);
                if (rendered === DeferredString) {
                    return [item.otag, item.n, item.ctag].join(' ');
                } else {
                    return rendered;
                }
            }
        }).join('');
    };

    Task.prototype.renderOptions = function(toRender, renderContext) {
        var self = this;
        if (_.isEmpty(toRender)) {
            return toRender;
        } else if (typeof toRender === 'string') {
            return self.render(toRender, renderContext);
        } else {
            return _.transform(toRender, function(acc, v, k) {
                acc[k] = self.renderOptions(v, renderContext);
            }, toRender);
        }
    };

    Task.prototype.renderOwnOptions = function(toRender) {
        this.options = this.renderOptions(toRender, this.renderContext);
    };

    Task.prototype.instantiateJob = function() {
        assert.string(this.definition.runJob, 'Task.definition.runJob injector string');
        // This should already have been validated to exist
        var Job = injector.get(this.definition.runJob);
        this.job = new Job(this.options, this.context, this.instanceId);
        assert.func(this.job.run, "Task Job run method");
        assert.func(this.job.cancel, "Task Job cancel method");
    };

    Task.prototype.run = function() {
        var self = this;
        if (self.state === TaskStates.Running) {
            return Promise.resolve();
        }
        self.state = TaskStates.Running;

        try {
            self.renderOwnOptions(self.options);
            self.instantiateJob();
        } catch (e) {
            self.state = TaskStates.Failed;
            self.error = e;
            return self;
        }

        logger.info("Running task job.", {
            taskId: self.instanceId,
            name: self.definition.friendlyName,
            job: self.definition.runJob
        });

        return self.job.run()
        .then(function() {
            self.state = TaskStates.Succeeded;
        })
        .then(function() {
            return self;
        })
        .catch(Errors.TaskCancellationError, function(e) {
            self.state = TaskStates.Cancelled;
            self.error = e;
            return null;
        })
        .catch(Errors.TaskStopError, function(e) {
            self.state = TaskStates.Pending;
            self.error = e;
            return null;
        })
        .catch(Errors.TaskTimeoutError, function(e) {
            self.state = TaskStates.Timeout;
            self.error = e;
            return null;
        })
        .catch(function(e) {
            self.state = TaskStates.Failed;
            self.error = e;
            return null;
        });
    };

    Task.prototype.stop = function() {
        this.state = TaskStates.Pending;
        return this.job.cancel(new Errors.TaskStopError());
    };

    Task.prototype.cancel = function(error) {
        error = error || new Errors.TaskCancellationError();
        this.error = error;

        if (_.contains(Constants.FinishedTaskStates, this.state)) {
            return Promise.resolve(this);
        } else if (this.state === TaskStates.Pending) {
            // This block handles cancellation before run() has
            // been called (i.e. the task has been created, but not
            // yet scheduled to run by the scheduler via taskProtocol.subscribeRun
            this.state = TaskStates.Cancelled;
            return Promise.resolve();
        } else if (this.state !== TaskStates.Cancelled) {
            // Task cancellation is passed down to the job first
            // and then bubbled up into the promise chain
            // created in this.run()
            return this.job.cancel(error);
        }
    };


    // enables JSON.stringify(this)
    Task.prototype.toJSON = function toJSON() {
        return this.serialize();
    };

    Task.prototype.serialize = function serialize() {
        var redactKeys = ['renderContext', 'subscriptions', '_events', '_cancellable'];
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


    // NOTE: getAll() has turned out to be a perf bottleneck, taking up to 40ms in
    // some cases. Until we make configuration updates dynamic, just cache this
    // at startup to avoid performance issues.
    Task.configCache = configuration.getAll();

    return Task;
}
