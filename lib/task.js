// Copyright 2015, EMC, Inc.

'use strict';

var di = require('di');

module.exports = factory;
di.annotate(factory, new di.Provide('Task.Task'));
di.annotate(factory,
    new di.Inject(
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
        'Services.Environment',
        'Services.Waterline',
        di.Injector
    )
);

/**
 * Injectable wrapper for dependencies
 * @param logger
 */
function factory(
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
    env,
    waterline,
    injector
) {

    var TaskStates = Constants.Task.States;
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
        self.error = null;

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
        self.renderContext.api.templates = self.renderContext.api.base + '/templates';
        self.renderContext.api.profiles = self.renderContext.api.base + '/profiles';
        self.renderContext.api.lookups = self.renderContext.api.base + '/lookups';
        self.renderContext.api.files = self.renderContext.api.base + '/files';
        self.renderContext.api.nodes = self.renderContext.api.base + '/nodes';

        var timeout = self.definition.options.$taskTimeout;
        // Support schedulerOverrides for backwards graph definition compatibility
        if (!timeout && self.definition.options.schedulerOverrides) {
            timeout = self.definition.options.schedulerOverrides.timeout;
        }
        if (typeof timeout !== 'number') {
            timeout = 24 * 60 * 60 * 1000;  // default to 24 hour timeout
        }
        self.$taskTimeout = timeout;

        return self;
    }

    Task.prototype.getSkuId = function(nodeId) {
        if(!nodeId)  {
            return Promise.resolve();
        }

        return waterline.nodes.needByIdentifier(nodeId)
            .then(function(node) {
                if (node.sku) {
                    return node.sku;
                }
            });
    };

    Task.prototype.renderAll = function(nodeId, options){
        var self = this;
        return self.getSkuId(nodeId).
            then(function (skuid) {
                if (!skuid){
                    return env.get('config', {}, [Constants.Scope.Global]).
                        then( function(env){
                            self.renderContext.env = env;
                        });
                }else{
                    return Promise.all([
                            env.get('config', {}, [skuid]),
                            env.get('config', {}, [skuid, Constants.Scope.Global])
                        ]).spread(function (sku, env) {
                            self.renderContext.sku = sku;
                            self.renderContext.env = env;
                        });
                }
            }).finally(function(){
                self.renderOwnOptions(_.cloneDeep(options));
            });
    };

    Task.prototype.renderString = function(str, context, depth, maxDepth) {
        var self = this;

        if (depth > maxDepth) {
            throw new Errors.TemplateRenderError("Exceeded max depth rendering string: " + str);
        }

        var rendered;

        // Support OR syntax: {{ options.value | options.backupValue | default }}
        // ^^ Will return "default" if options.value and options.backupValue do not exist
        _.some(str.split(/[\s\n]?\|+[\s\n]?/), function(item) {
            // If item is a string that should not be rendered yet, defer rendering
            // until the next render stage
            rendered = item.indexOf('.') > -1 ? catalogSearch.getPath(context, item) : item;
            return rendered;
        });

        if (!rendered) {
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
                return rendered;
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
        if (self.state !== TaskStates.Pending) {
            return Promise.resolve();
        }
        self.state = TaskStates.Running;
        return Promise.resolve()
            .then(function() {
                return self.renderAll(self.nodeId, self.definition.options);
            })
            .then(function() {
                return self._run();
            })
            .then(function() {
                self.state = TaskStates.Succeeded;
            })
            .then(function() {
                return self;
            })
            .catch(Errors.TaskCancellationError, function(e) {
                self.state = TaskStates.Cancelled;
                self.error = e;
                return self;
            })
            .catch(Errors.TaskStopError, function(e) {
                self.state = TaskStates.Pending;
                self.error = e;
                return null;
            })
            .catch(Errors.TaskTimeoutError, function(e) {
                self.state = TaskStates.Timeout;
                self.error = e;
                return self;
            })
            .catch(function(e) {
                self.state = TaskStates.Failed;
                self.error = e;
                return self;
            })
            .finally(function() {
                if (self.timer) {
                    clearTimeout(self.timer);
                }
                if (self.error) {
                    var data = {
                        error: self.error.toString(),
                        taskId: self.instanceId,
                        graphId: self.context.graphId,
                        injectableName: self.name
                    };
                    if (self.nodeId) {
                        data.node = self.nodeId;
                    }
                    logger.error('Task failed', data);
                }
            });
    };

    Task.prototype._run = function() {
        var self = this;

        self.instantiateJob();

        // TODO: it may better to define this in the database in the case that
        // a task runner crashes, and the task is re-run, the timeout clock
        // will reset. It's somewhat of a design question whether we want
        // timeouts to be for each task iteration or for the max time allowed period.
        // If timeout is undefined, this evaluates to false as well.
        if (self.$taskTimeout > 0) {
            self.timer = setTimeout(function() {
                // This ends up cancelling the job, which causes the promise returned
                // by the `self.job.run()` call below to then reject, which gets
                // caught by the promise chain in `task.run()`.
                self.cancel(new Errors.TaskTimeoutError(
                    "Task did not complete within " + self.$taskTimeout + "ms"));
            }, self.$taskTimeout);
        }
        logger.info("Running task job.", {
            taskId: self.instanceId,
            name: self.definition.friendlyName,
            job: self.definition.runJob
        });

        return self.job.run();
    };

    Task.prototype.stop = function() {
        //Used to handle stopping a task without triggering
        //the downstream cancellation logic
        this.state = TaskStates.Pending;
        return this.job.cancel(new Errors.TaskStopError());
    };

    Task.prototype.cancel = function(error) {
        error = error || new Errors.TaskCancellationError();
        this.error = error;

        if (_.contains(Constants.Task.FinishedStates, this.state)) {
            return;
        } else if (this.state === TaskStates.Pending) {
            // This block handles cancellation before run() has
            // been called (i.e. the task has been created, but not
            // yet scheduled to run by the scheduler via taskProtocol.subscribeRun
            this.state = TaskStates.Cancelled;
        } else if (this.state !== TaskStates.Cancelled) {
            // Task cancellation is passed down to the job first
            // and then bubbled up into the promise chain
            // created in this.run()
            this.job.cancel(error);
        }
    };


    // enables JSON.stringify(this)
    Task.prototype.toJSON = function toJSON() {
        return this.serialize();
    };

    Task.prototype.serialize = function serialize() {
        var redactKeys = ['renderContext', 'timer'];
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

