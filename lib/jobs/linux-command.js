// Copyright 2014, Renasar Technologies Inc.
/* jshint: node:true */

'use strict';

var di = require('di');

module.exports = commandJobFactory;
di.annotate(commandJobFactory, new di.Provide('Job.Linux.Commands'));
    di.annotate(commandJobFactory,
    new di.Inject(
        'Job.Base',
        'JobUtils.CommandParser',
        'Services.Waterline',
        'Logger',
        'Promise',
        'Assert',
        'Util',
        '_'
    )
);
function commandJobFactory(BaseJob, parser, waterline, Logger, Promise, assert, util, _) {
    var logger = Logger.initialize(commandJobFactory);

    /**
     * @param {Object} options
     * @param {Object} context
     * @param {String} taskId
     * @constructor
     */
    function CommandJob(options, context, taskId) {
        CommandJob.super_.call(this, logger, options, context, taskId);

        assert.string(this.context.target);
        assert.arrayOfObject(this.options.commands);

        this.nodeId = this.context.target;

        if (this.options.runOnlyOnce === undefined) {
            this.options.runOnlyOnce = true;
        }
        assert.bool(this.options.runOnlyOnce);

        this.commands = this.buildCommands(options.commands);
        this.hasSentCommands = false;
    }
    util.inherits(CommandJob, BaseJob);

    /**
     * @memberOf CommandJob
     * @function
     */
    CommandJob.prototype._run = function() {
        var self = this;

        self._subscribeRequestCommands(function() {
            return self.handleRequest();
        });

        self._subscribeRespondCommands(function(data) {
            self.handleResponse(data)
            .then(function() {
                self._done();
            })
            .catch(function(err) {
                self._done(err);
            });
        });
    };

    /**
     * @memberOf CommandJob
     * @function
     */
    CommandJob.prototype.handleRequest = function() {
        if (this.options.runOnlyOnce && this.hasSentCommands) {
            logger.silly("Ignoring command request from node because commands " +
                    "have already been sent.", {
                        id: this.nodeId,
                        instanceId: this.taskId
                    });
            return;
        }
        this.hasSentCommands = true;
        logger.debug("Received command request from node. Sending commands.", {
            id: this.nodeId,
            commands: this.commands
        });
        return {
            identifier: this.nodeId,
            tasks: this.commands
        };
    };

    /**
     * @memberOf CommandJob
     * @function
     */
    CommandJob.prototype.handleResponse = function(data) {
        var self = this;
        logger.debug("Received command payload from node.", {
            id: self.nodeId
        });
        var failed = _.some(data.tasks, function(task) {
            if (task.error && !_.contains(task.acceptedResponseCodes, task.error.code)) {
                logger.error("Failure running command: '%s'".format(task.cmd), {
                    id: self.nodeId,
                    response: task
                });
                return true;
            }
        });

        if (failed) {
            return Promise.reject(new Error("Encountered a failure running commands on node"));
        }
        var catalogTasks = _.compact(_.map(data.tasks, function(task) {
            if (task.catalog) {
                return task;
            }
        }));

        return Promise.resolve()
        .then(function() {
            return _.isEmpty(catalogTasks) || self.catalogUserTasks(catalogTasks);
        })
        .catch(function(err) {
            logger.error("Job error processing catalog output.", {
                error: err,
                id: self.nodeId,
                taskContext: self.context
            });
            throw err;
        });
    };

    /**
     * @memberOf CommandJob
     * @function
     */
    CommandJob.prototype.catalogUserTasks = function(tasks) {
        var self = this;

        return parser.parseUnknownTasks(tasks)
        .spread(function() {
            var addCatalogPromises = [];

            _.forEach(arguments, function(result) {
                if (result.error) {
                    logger.error("Failed to parse data for " +
                        result.source + ', ' + result.error,
                        { error: result });
                } else {
                    if (result.store) {
                        addCatalogPromises.push(
                            // Bluebird promisify the waterline 'when' promise so
                            // we can call spread on it
                            Promise.resolve(waterline.catalogs.create({
                                node: self.nodeId,
                                source: result.source || 'unknown',
                                data: result.data
                            }))
                        );
                    } else {
                        logger.debug("Catalog result for " + result.source +
                            " has not been marked as significant. Not storing.");
                    }
                }
            });

            return addCatalogPromises;
        });
    };

    /**
     * Transforms the command option json from a task definition to a json schema
     * consumed by the bootstrap.js task runner
     *
     * @example
     * Sample input:
     *  [
     *      {
     *          command: 'sudo lshw -json',
     *          catalog: { format: 'json', source: 'lshw user' }
     *      },
     *      {
     *          command: 'test',
     *          acceptedResponseCodes: [1]
     *      }
     *  ]
     *
     * Sample output:
     *  [
     *      {
     *          cmd: 'sudo lshw -json',
     *          source: 'lshw user',
     *          format: 'json',
     *          catalog: true
     *      },
     *      {
     *          cmd: 'test',
     *          acceptedResponseCodes: [1]
     *      }
     *  ]
     *
     * @memberOf CommandJob
     * @function
     */
    CommandJob.prototype.buildCommands = function(commands) {
        return _.map(_.toArray(commands), function(cmd) {
            return _.transform(cmd, function(cmdObj, v, k) {
                if (k === 'catalog') {
                    cmdObj.source = v.source;
                    cmdObj.format = v.format;
                    cmdObj.catalog = true;
                } else if (k === 'command') {
                    cmdObj.cmd = v;
                } else if (k === 'acceptedResponseCodes') {
                    cmdObj[k] = v;
                }
            }, {});
        });
    };

    return CommandJob;
}
