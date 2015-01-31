// Copyright 2014, Renasar Technologies Inc.
/* jshint: node:true */

'use strict';

var di = require('di');

module.exports = commandJobFactory;
di.annotate(commandJobFactory, new di.Provide('Job.Linux.Commands'));
    di.annotate(commandJobFactory,
    new di.Inject(
        'Job.Base',
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
function commandJobFactory(BaseJob, parser, waterline, Logger, assert, util, Q, _) {
    var logger = Logger.initialize(commandJobFactory);

    /**
     *
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
    util.inherits(CommandJob, BaseJob);

    /**
     * @memberOf CommandJob
     * @returns {Q.Promise}
     */
    CommandJob.prototype._run = function() {
        var self = this;

        logger.info("Running linux shell command job.", {
            id: this.nodeId
        });

        this._subscribeRequestCommands(function() {
            logger.debug("Received command request from node. Sending commands.", {
                id: self.nodeId,
                commands: self.commands
            });
            return {
                identifier: this.nodeId,
                tasks: self.commands
            };
        });

        this._subscribeRespondCommands(function(data) {
            logger.debug("Received command payload from node.", {
                id: self.nodeId
            });
            this.emit('response', data);
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
                self._done();
            }).catch(function(err) {
                logger.error("Job error processing catalog output.", {
                    error: err,
                    id: self.nodeId,
                    taskContext: self.context
                });
                self.cancel();
            });
        });
    };

    return CommandJob;
}
