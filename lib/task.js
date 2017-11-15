// Copyright 2015, EMC, Inc.

'use strict';

var di = require('di');

module.exports = factory;
di.annotate(factory, new di.Provide('Task.Task'));
di.annotate(factory,
    new di.Inject(
        'Services.Configuration',
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
        'TaskOption.Validator',
        'Task.taskLibrary',
        di.Injector
    )
);

/**
 * Injectable wrapper for dependencies
 * @param logger
 */
function factory(
    configuration,
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
    validator,
    taskLibrary,
    injector
) {
    var COMMON_OPTIONS_SCHEMA = 'common-task-options.json';

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
        assert.object(context, 'Task shared context object');

        self.definition = _.cloneDeep(definition);

        // run state related properties
        self.cancelled = false;
        taskOverrides = taskOverrides || {};
        // Don't do context rendering if this is true. This signals to only
        // do up-front validation before we have any dynamic data available.
        self.compileOnly = taskOverrides.compileOnly || false;

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

        var server;
        if (_.has(context, 'proxy')) {
            server = context.proxy;
        } else {
            server = 'http://%s:%s'.format(
                Task.configCache.apiServerAddress,
                Task.configCache.apiServerPort
            );
        }
        var fileServerUri;
        if (_.has(Task.configCache, 'fileServerAddress')) {
            fileServerUri = 'http://%s'.format(Task.configCache.fileServerAddress);
            if (_.has(Task.configCache, 'fileServerPort')) {
                fileServerUri = fileServerUri + ':' + Task.configCache.fileServerPort;
            }
            if (_.has(Task.configCache, 'fileServerPath')) {
                fileServerUri = fileServerUri + Task.configCache.fileServerPath;
                fileServerUri = _.trimRight(fileServerUri, '/');
            }
        } else {
            fileServerUri = server;
        }

        self.renderContext = {
            server: Task.configCache,
            api: { server: server },
            file: {
                server: fileServerUri
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

        self._taskTimeout = self.definition.options._taskTimeout;

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

    Task.prototype._isDeferredRender = function(renderKey) {
        return this.compileOnly && renderKey === 'context';
    };

    Task.prototype.renderString = function(str, context, depth, maxDepth) {
        var self = this;

        if (depth > maxDepth) {
            throw new Errors.TemplateRenderError("Exceeded max depth rendering string: " + str);
        }

        var rendered;
        var deferredRender = false;

        // Support OR syntax: {{ options.value | options.backupValue | default }}
        // ^^ Will return "default" if options.value and options.backupValue do not exist
        _.some(str.split(/[\s\n]?\|+[\s\n]?/), function(item) {
            // If item is a string that should not be rendered yet (i.e. it requires
            // data generated dynamically at workflow runtime), defer rendering
            // until later
            if (self._isDeferredRender(item.split('.')[0])) {
                rendered = '{{' + str + '}}';
                deferredRender = true;
                return rendered;
            }
            rendered = item.indexOf('.') > -1 ? _.get(context, item) : item;
            return rendered;
        });

        if (!rendered) {
            throw new Errors.TemplateRenderError("Value does not exist for " + str);
        } else if (deferredRender) {
            return rendered;
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
        var renderedValue;
        if  (Array.isArray(source)) {
            renderedValue = [];
            source.forEach(function (element) {
                renderedValue.push(Hogan.parse(Hogan.scan(element)));
            });
            return renderedValue;
        }
        renderedValue = Hogan.parse(Hogan.scan(source));
        return renderedValue;
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


        var isString = false;
        var mappedValues  = _.map(parsed, function(item) {
            // Read Hogan parse tree objects
            // _t === simple text
            // _v === value to be rendered
            if (item.tag === '_t') {
                return _.values(item.text).join('');
            } else if (item.tag === '_v') {
                depth = _.isNumber(depth) ? depth : 0;
                var type = _.get(context, item.n);

                if(typeof type === 'string' || type instanceof String ||  typeof type === 'undefined' || type === null)  {
                    isString = true;
                } else {
                    isString = false;
                }
                return self.renderString(item.n, context, depth, 50);
            }

            });

        if (isString){
            return mappedValues.join('');
        }else{
            return mappedValues[0];
        }
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
        // This should already have been validated to exist
        var Job = injector.get(this.definition.runJob);
        this.job = new Job(this.options, this.context, this.instanceId, this.definition.label);
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
                Task.validateOptions(self.definition, self.options, { skipContext: false });
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
        if (self._taskTimeout > 0) {
            self.timer = setTimeout(function() {
                // This ends up cancelling the job, which causes the promise returned
                // by the `self.job.run()` call below to then reject, which gets
                // caught by the promise chain in `task.run()`.
                self.cancel(new Errors.TaskTimeoutError(
                    "Task did not complete within " + self._taskTimeout + "ms"));
            }, self._taskTimeout);
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
        var self = this;
        error = error || new Errors.TaskCancellationError();
        self.error = error;

        if (self.state === TaskStates.Running) {
            // Task cancellation is passed down to the job first
            // and then bubbled up into the promise chain
            // created in this.run()
            self.state = TaskStates.Cancelled;
            return self.job
                .cancel(error)
                .catch(function() {
                    //This is expected Error when task is cancelled, which has been addressed in
                    //this.run(), so we just swallow it here.
                });
        }

        if (self.state === TaskStates.Pending) {
            // This block handles cancellation before run() has
            // been called (i.e. the task has been created, but not
            // yet scheduled to run by the scheduler via taskProtocol.subscribeRun
            self.state = TaskStates.Cancelled;
        }
        return Promise.resolve();
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

    /**
     * compile task instance
     *
     * @memberof Task
     * @return {Promise} Returns a fulfilled promise if compile success, otherwise a rejected
     * promise.
     */
    Task.prototype.compile = function compile() {
        var self = this;
        return self.renderAll(self.nodeId, self.definition.options)
        .then(function() {
            Task.validateOptions(self.definition, self.options, { skipContext: true });
        });
    };

    /**
     * handle task common options
     *
     * This handling will operate on the input options itself. Currently this function only checks
     * the task timout setting, if in future there is additional common setting, put it here as
     * well.
     *
     * @param {Object} options - The input task options.
     * @return {Object} the result options object.
     */
    function handleCommonOptions(options) {
        // check the task timeout, if not specified, then set a default one.
        if (!options.hasOwnProperty('_taskTimeout') && options.schedulerOverrides &&
                options.schedulerOverrides.hasOwnProperty('timeout')) {
            options._taskTimeout = options.schedulerOverrides.timeout;
        }

        if (typeof options._taskTimeout !== 'number') {
            options._taskTimeout = 24 * 60 * 60 * 1000; //default to 24 hour timeout
        }
        return options;
    }

    function _validateSchemaProperty(schema, title) {
        if (!schema || _.isString(schema) || _.isObject(schema)) {
            return;
        }
        throw new Error( (title ? (title + ': ') : '') + 'schema must be either string or object');
    }

    Task.getBaseTask = function(query) {
        var injectableName;
        if (_.isString(query)) {
            injectableName = query;
        }
        else if (_.isObject(query)) {
            assert.string(query.implementsTask);
            injectableName = query.implementsTask;
        }
        else {
            throw new Error('getBaseTask allows either input injectableName or task definition');
        }

        var baseTaskDefinition = _.find(taskLibrary, function(task) {
            return !task.implementsTask && task.injectableName === injectableName;
        });

        if (!baseTaskDefinition) {
            throw new Error('cannot find baseTask with injectableName=' + injectableName);
        }
        return baseTaskDefinition;
    };

    Task.validateBaseTask = function(baseTask) {
        assert.string(baseTask.friendlyName, 'BaseTask friendlyName');
        assert.string(baseTask.injectableName, 'BaseTask injectableName');
        assert.object(baseTask.requiredProperties, 'requiredProperties');
        assert.object(baseTask.properties, 'properties');
        _validateSchemaProperty(baseTask.optionsSchema, 'BaseTask');

        assert.string(baseTask.runJob, 'BaseTask runJob');
        var Job = injector.get(baseTask.runJob);
        assert.func(Job.prototype.run, "Task Job run method");
        assert.func(Job.prototype.cancel, "Task Job cancel method");
    };

    /**
     * validate task definition
     *
     * @param {Object} definition - The task definition that to be validated.
     * @throws Will throw an error if the validation fails.
     * @static
     */
    Task.validateDefinition = function validateDefinition(definition) {
        assert.object(definition, 'Task definition data');
        assert.string(definition.friendlyName, 'Task definition friendly name');
        assert.string(definition.implementsTask, 'Task definition implementsTask');
        assert.object(definition.options, 'Task definition option');
        assert.object(definition.properties, 'Task definition properties');
        _validateSchemaProperty(definition.optionsSchema, 'Task definition');

        var baseTask = Task.getBaseTask(definition);
        Task.validateBaseTask(baseTask);
    };

    /**
     * create task instance
     *
     * There are two kinds of task instance creation:
     * 1 - full creation
     * This means the runtime context is ready, all task features can be enabled.
     *
     * 2 - compile-only creation
     * This is used when the runtime context is not ready, the creation will skip the features
     * that leverage the context.
     * Set 'taskOverrides.compileOnly' to true can enable the compile-only creation.
     *
     * @param {Object} definition - The task definition
     * @param {Object} taskOverides - The parameter to overide some task definition's properties.
     * @param {Object} context - The task graph runtime context
     * @return {Promise<Task>} - Return a task instance if input parameters are valid.
     * @static
     */
    Task.create = function create(definition, taskOverrides, context) {
        return Promise.try(function() {
            Task.validateDefinition(definition);
        })
        .then(function() {
            //set task common options so that it can be validated using schema as well.
            handleCommonOptions(definition.options);
        })
        .then(function() {
            return new Task(definition, taskOverrides, context);
        })
        .tap(function(task) {
            // If compileOnly is falsey, do rendering in the `.run()` step for
            // compatibility with how the task runner code is written.
            if (taskOverrides.compileOnly) {
                return task.compile();
            }
        });
    };

    Task.getCommonSchema = function () {
        return validator.getSchema(COMMON_OPTIONS_SCHEMA);
    };

    Task.getTaskSpecificSchema = function(definition) {
        var taskSpecific = definition.optionsSchema;
        if (_.isString(taskSpecific)) {
            taskSpecific = validator.getSchema(taskSpecific);
        }
        return taskSpecific;
    };

    Task.getJobSchema = function(definition) {
        var baseTask = Task.getBaseTask(definition);
        var job = baseTask.optionsSchema;
        if (_.isString(job)) {
            job = validator.getSchema(job);
        }
        return job;
    };

    Task.getFullSchema = function getFullSchema(definition) {
        var schemas = _.compact([
            Task.getCommonSchema(),
            Task.getTaskSpecificSchema(definition),
            Task.getJobSchema(definition)
        ]);

        //since each sub schema may has its own `definitions`, so if directly merge those schemas
        //with allOf, then those $ref to definitions will become invalid. So before merging
        //sub-schemas, all $ref in these schemas have to be resolved so as to remove the reference
        //on their specific definitions.
        var resolvedSchemas = _.map(schemas, function(schema) {
            var tempSchemaId = uuid.v4();

            //add schema then remove it is to resolve reference
            validator.addSchema(schema, tempSchemaId);
            var schemaResolved = validator.getSchemaResolved(tempSchemaId);
            validator.removeSchema(tempSchemaId);
            delete schemaResolved.id;
            return schemaResolved;
        });

        //Combine common/job/taskSpecific schema into a large schema
        return {
            allOf: resolvedSchemas
        };
    };

    Task.validateOptions = function (definition, options, flags) {
        var jobSchema;

        //if the definition is from taskgraph, then the taskgraph has helped to assigned the
        //joOptionsSchema, so it's uncessary to lookup the baseTask again
        if (definition.hasOwnProperty('jobOptionsSchema')) {
            jobSchema = definition.jobOptionsSchema;
        }
        else {
            var baseTask = Task.getBaseTask(definition);
            jobSchema = baseTask.optionsSchema;
        }
        var schemas = _.compact([
            COMMON_OPTIONS_SCHEMA,
            definition.optionsSchema,
            jobSchema
        ]);

        _.forEach(schemas, function(schema) {
            try {
                if (flags && flags.skipContext) {
                    validator.validateContextSkipped(schema, options);
                }
                else {
                    validator.validate(schema, options);
                }
            }
            catch (err) {
                err.message = definition.injectableName + ': ' + err.message;
                throw err;
            }
        });
    };

    // NOTE: getAll() has turned out to be a perf bottleneck, taking up to 40ms in
    // some cases. Until we make configuration updates dynamic, just cache this
    // at startup to avoid performance issues.
    Task.configCache = configuration.getAll();

    return Task;
}
