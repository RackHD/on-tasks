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
        'Promise',
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
        ShellRebootJob.super_.call(this, logger, options, context, taskId);

        assert.string(this.context.target);
        assert.number(this.options.rebootCode);

        this.nodeId = this.context.target;
    }
    util.inherits(ShellRebootJob, BaseJob);

    /**
     * @memberOf ShellRebootJob
     */
    ShellRebootJob.prototype._run = function() {
        var self = this;

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
