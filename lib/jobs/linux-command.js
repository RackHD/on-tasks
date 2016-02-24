// Copyright 2015, EMC, Inc.

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
        'JobUtils.Commands',
        '_'
    )
);
function commandJobFactory(BaseJob, parser, waterline, Logger, Promise, assert, util, CommandUtil) {
    var logger = Logger.initialize(commandJobFactory);
    var commandUtil;
    /**
     * @param {Object} options
     * @param {Object} context
     * @param {String} taskId
     * @constructor
     */
    function CommandJob(options, context, taskId) {
        CommandJob.super_.call(this, logger, options, context, taskId);
        assert.string(this.context.target);
        commandUtil = new CommandUtil(this.context.target);
        this.commands = commandUtil.buildCommands(options.commands);
        assert.arrayOfObject(this.commands);

        this.nodeId = this.context.target;

        if (this.options.runOnlyOnce === undefined) {
            this.options.runOnlyOnce = true;
        }
        assert.bool(this.options.runOnlyOnce);

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
            commandUtil.handleRemoteFailure(data.tasks)
            .then(commandUtil.parseResponse.bind(commandUtil))
            .spread(commandUtil.catalogParsedTasks.bind(commandUtil))
            .spread(function() {
                self._done();
            })
            .catch(function(err) {
                self._done(err);
            });
        });

        // Called if this job is used to render a script template
        self._subscribeRequestProperties(function() {
            return self.options;
        });
    };

    /**
     * @memberOf CommandJob
     * @function
     */
    CommandJob.prototype.handleRequest = function() {
        if (this.options.runOnlyOnce && this.hasSentCommands) {
            logger.debug("Ignoring command request from node because commands " +
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

    return CommandJob;
}
