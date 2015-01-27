// Copyright 2014, Renasar Technologies Inc.
/* jshint: node:true */

'use strict';

var di = require('di');

module.exports = shellRebootJobFactory;
di.annotate(shellRebootJobFactory, new di.Provide('Job.Linux.ShellReboot'));
    di.annotate(shellRebootJobFactory,
    new di.Inject(
        'Job.Base',
        'Logger',
        'Assert',
        'Util',
        'Q',
        '_'
    )
);
function shellRebootJobFactory(BaseJob, Logger, assert, util) {
    var logger = Logger.initialize(shellRebootJobFactory);

    /**
     *
     * @param {Object} options
     * @param {Object} context
     * @param {String} taskId
     * @constructor
     */
    function ShellRebootJob(options, context, taskId) {
        assert.string(context.target);
        assert.number(options.rebootCode);

        this.options = options;
        this.context = context;
        this.logger = logger;
        this.taskId = taskId;
        this.nodeId = context.target;

        ShellRebootJob.super_.call(this);
    }
    util.inherits(ShellRebootJob, BaseJob);

    /**
     * @memberOf ShellRebootJob
     */
    ShellRebootJob.prototype._run = function() {
        var self = this;

        logger.info("Running shell reboot job.", {
            id: this.nodeId
        });

        this._subscribeRequestCommands(function() {
            logger.debug("Received command request from node. Telling it to reboot.", {
                id: self.nodeId
            });
            process.nextTick(function() {
                self._done();
            });
            return {
                identifier: self.nodeId,
                tasks: [ { cmd: '' } ],
                exit: self.options.rebootCode
            };
        });
    };

    return ShellRebootJob;
}
