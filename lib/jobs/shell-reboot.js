// Copyright 2015, EMC, Inc.

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
        if (this.context.rebootAfterCatalog === undefined) {
            this.context.rebootAfterCatalog = true;
        }
        assert.bool(this.context.rebootAfterCatalog);

        this.nodeId = this.context.target;
    }
    util.inherits(ShellRebootJob, BaseJob);

    /**
     * @memberOf ShellRebootJob
     */
    ShellRebootJob.prototype._run = function() {
        var self = this;

        if(!this.context.rebootAfterCatalog){
            logger.warning("rebootAfterCatalog is " + this.context.rebootAfterCatalog + ". Will skip reboot.", {
                node: self.nodeId
            });
            return self._done();
        }

        this._subscribeRequestCommands(function() {
            logger.info("Received command request from node. Telling it to reboot.", {
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
