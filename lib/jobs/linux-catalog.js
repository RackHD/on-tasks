// Copyright 2014, Renasar Technologies Inc.
/* jshint: node:true */

'use strict';

var di = require('di'),
    events = require('events');

module.exports = catalogJobFactory;
di.annotate(catalogJobFactory, new di.Provide('Job.Linux.Catalog'));
    di.annotate(catalogJobFactory,
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
function catalogJobFactory(taskProtocol, parser, waterline, Logger, assert, util, Q, _) {
    var logger = Logger.initialize(catalogJobFactory);

    /**
     *
     * @param {Object} options
     * @constructor
     */
    function CatalogJob(options, context, taskId) {
        assert.object(options);
        assert.object(context);
        assert.uuid(taskId);
        assert.string(context.target);
        assert.arrayOfString(options.commands);

        this.options = options;
        this.taskId = taskId;
        this.nodeId = context.target;
        this.subscriptions = [];
        this.commands = options.commands;
        var _commands = _.isArray(options.commands) ? options.commands : [options.commands];
        this.commands = _.map(_commands, function(cmd) {
            var obj = { cmd: cmd };
            // TODO: add support for this in the data definition
            if (options.acceptedResponseCodes) {
                obj.acceptedResponseCodes = options.acceptedResponseCodes;
            }
            return obj;
        });
    }
    util.inherits(CatalogJob, events.EventEmitter);

    /**
     * @memberOf CatalogJob
     * @returns {Q.Promise}
     */
    CatalogJob.prototype.run = function() {
        var self = this,
            deferred = Q.defer();

        logger.info("Running catalog linux job.", {
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
            var parsePromises = parser.parseTasks(data.tasks);

            Q.spread(parsePromises, function() {
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

    CatalogJob.prototype.stop = function() {
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
     * @memberOf CatalogJob
     * @returns {Q.Promise}
     */
    CatalogJob.prototype.cancel = function() {
        logger.info("Canceling catalog linux job.", {
            id: this.nodeId
        });
        return this.stop();
    };

    /**
     * @memberOf CatalogJob
     * @returns CatalogJob
     */
    CatalogJob.create = function(options, context, taskId) {
        return new CatalogJob(options, context, taskId);
    };

    return CatalogJob;
}
