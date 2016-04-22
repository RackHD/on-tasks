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
        'Services.Lookup',
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
    lookup,
    Logger,
    assert,
    util,
    Promise,
    CommandUtil,
    _
    ) {
    var logger = Logger.initialize(catalogJobFactory);
    var commandUtil;
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
        commandUtil = new CommandUtil(this.nodeId);
        this.commands = commandUtil.buildCommands(options.commands);
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
                data: data
            });

            return commandUtil.handleRemoteFailure(data.tasks)
            .then(parser.parseTasks.bind(parser))
            .tap(self.updateLookups.bind(self))
            .spread(commandUtil.catalogParsedTasks.bind(commandUtil))
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

    CatalogJob.prototype.updateLookups = function(parsedTasks) {
        var self = this;
        return Promise.map(parsedTasks, function(result){
            return _.map(result.lookups, function(lookupEntry) {
                if (lookupEntry.mac && lookupEntry.ip) {
                    return lookup.setIpAddress(lookupEntry.ip, lookupEntry.mac);
                } else if (lookupEntry.mac) {
                    return waterline.lookups.upsertNodeToMacAddress(
                                self.nodeId, lookupEntry.mac);
                }
            });
        });
    };

    return CatalogJob;
}
