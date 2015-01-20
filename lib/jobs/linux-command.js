// Copyright 2014, Renasar Technologies Inc.
/* jshint: node:true */

'use strict';

var di = require('di'),
    events = require('events');

module.exports = commandJobFactory;
di.annotate(commandJobFactory, new di.Provide('Job.Linux.Commands'));
    di.annotate(commandJobFactory,
    new di.Inject(
        'Protocol.Task',
        'JobUtils.CommandParser',
        'Services.Waterline',
        'Logger',
        'Assert',
        'Util',
        'Q',
        '_'
    )
);
function commandJobFactory(taskProtocol, parser, waterline, Logger, assert, util, Q, _) {
    var logger = Logger.initialize(commandJobFactory);

    /**
     *
     * @param {Object} options
     * @constructor
     */
    function CommandJob(options, context, taskId) {
        assert.object(options);
        assert.object(context);
        assert.uuid(taskId);
        assert.string(context.target);
        assert.arrayOfObject(options.commands);

        this.options = options;
        this.taskId = taskId;
        this.nodeId = context.target;
        this.subscriptions = [];
        this.commands = options.commands;
        this.results = {};

        var _commands = _.isArray(options.commands) ? options.commands : [options.commands];
        this.commands = _.map(_commands, function(cmd) {
            var obj = { cmd: cmd.command, source: cmd.source, format: cmd.format };
            // TODO: add support for this in the data definition
            if (options.acceptedResponseCodes) {
                obj.acceptedResponseCodes = options.acceptedResponseCodes;
            }
            return obj;
        });
    }
    util.inherits(CommandJob, events.EventEmitter);

    /**
     * @memberOf CommandJob
     * @returns {Q.Promise}
     */
    CommandJob.prototype.run = function() {
        var self = this,
            deferred = Q.defer();

        logger.info("Running linux shell command job.", {
            id: this.nodeId
        });

        taskProtocol.subscribeRequestCommands(self.nodeId, function() {
                logger.debug("Received command request from node. Sending commands.", {
                    id: self.nodeId,
                    commands: self.commands
                });
                return {
                    identifier: this.nodeId,
                    tasks: self.commands
                };
            }.bind(self)
        ).then(function(subscription) {
            self.subscriptions.push(subscription);
            return taskProtocol.subscribeRespondCommands(self.nodeId, function(data) {
                    logger.debug("Received command payload from node.", {
                        id: self.nodeId
                    });
                    this.emit('response', data);
                }.bind(self)
            );
        }).then(function(subscription) {
            self.subscriptions.push(subscription);
        }).catch(function(error) {
            self.stop();
            deferred.reject(error);
        });

        this.on('response', function(data) {
            parser.parseUnknownTasks(data.tasks).spread(function() {
                var addCatalogPromises = [];

                _.forEach(arguments, function(result) {
                    if (result.error) {
                        logger.error("Failed to parse data for " +
                            result.source + ', ' + result.error,
                            { error: result });
                    } else {
                        if (result.store) {
                            addCatalogPromises.push(
                                // Q promisify the waterline 'when' promise so
                                // we can call spread on it, which is Q specific
                                Q.resolve(waterline.catalogs.create({
                                    node: self.nodeId,
                                    source: result.source,
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
            }).spread(function() {
                self.emit('done');
            }).catch(function(err) {
                logger.error("Job error processing catalog output.", {
                    error: err,
                    id: self.nodeId,
                    taskContext: self.context
                });
                self.cancel();
            });
        });

        this.on('done', function() {
            self.stop();
            deferred.resolve();
        });

        return deferred.promise;
    };

    CommandJob.prototype.stop = function() {
        var self = this;
        this.removeAllListeners();
        return Q.all(_.map(this.subscriptions, function(subscription) {
            return subscription.dispose();
        })).catch(function(error) {
            logger.error("Error removing job subscriptions.", {
                id: self.nodeId,
                error: error,
                context: self.context
            });
        });
    };

    /**
     * @memberOf CommandJob
     * @returns {Q.Promise}
     */
    CommandJob.prototype.cancel = function() {
        logger.info("Canceling linux shell command job.", {
            id: this.nodeId
        });
        return this.stop();
    };

    /**
     * @memberOf CommandJob
     * @returns CommandJob
     */
    CommandJob.create = function(options, context, taskId) {
        return new CommandJob(options, context, taskId);
    };

    return CommandJob;
}
