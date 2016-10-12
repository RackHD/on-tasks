// Copyright 2015, EMC, Inc.

'use strict';

var di = require('di');

module.exports = catalogJobFactory;
di.annotate(catalogJobFactory, new di.Provide('Job.Linux.Catalog'));
    di.annotate(catalogJobFactory,
    new di.Inject(
        'Job.Base',
        'JobUtils.CommandParser',
        'Services.Waterline',
        'Logger',
        'Assert',
        'Util',
        'Promise',
        'JobUtils.Commands',
        '_'
    )
);
function catalogJobFactory(
    BaseJob,
    parser,
    waterline,
    Logger,
    assert,
    util,
    Promise,
    CommandUtil,
    _
    ) {
    var logger = Logger.initialize(catalogJobFactory);
    /**
     *
     * @param {Object} options
     * @param {Object} context
     * @param {String} taskId
     * @constructor
     */
    function CatalogJob(options, context, taskId) {
        CatalogJob.super_.call(this, logger, options, context, taskId);

        assert.string(this.context.target);
        this.nodeId = this.context.target;
        this.commandUtil = new CommandUtil(this.nodeId);
        this.commands = this.commandUtil.buildCommands(options.commands);
        assert.arrayOfObject(this.commands);
    }
    util.inherits(CatalogJob, BaseJob);

    /**
     * @memberOf CatalogJob
     */
    CatalogJob.prototype._run = function() {
        var self = this;

        this._subscribeRequestCommands(function() {
            logger.debug("Received command request from node. Sending commands.", {
                id: self.nodeId,
                commands: self.commands
            });
            return {
                identifier: self.nodeId,
                tasks: self.commands
            };
        });

        this._subscribeRespondCommands(function(data) {
            logger.debug("Received command payload from node.", {
                id: self.nodeId,
                // This logs A LOT of data during cataloging. It is useful if
                // debugging why parsing is failing, but in general probably
                // more trouble than its worth.
                // data: data
                commands: _.map(data ? data.tasks : [], function(task) {
                    return task ? task.cmd : null;
                })
            });

            return self.commandUtil.handleRemoteFailure(data.tasks)
            .then(parser.parseTasks.bind(parser))
            .tap(self.commandUtil.updateLookups.bind(self.commandUtil))
            .spread(self.commandUtil.catalogParsedTasks.bind(self.commandUtil))
            .spread(function() {
                self._done();
            }).catch(function(err) {
                logger.error("Job error processing catalog output.", {
                    error: err,
                    id: self.nodeId,
                    taskContext: self.context
                });
                self._done(err);
            });
        });
    };

    return CatalogJob;
}
