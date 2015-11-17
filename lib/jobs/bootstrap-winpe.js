// Copyright 2015, EMC, Inc.

'use strict';

var di = require('di');

module.exports = bootstrapWinPEJobFactory;
di.annotate(bootstrapWinPEJobFactory, new di.Provide('Job.WinPE.Bootstrap'));
    di.annotate(bootstrapWinPEJobFactory,
    new di.Inject(
        'Job.Base',
        'Logger',
        'Assert',
        'Util'
    )
);
function bootstrapWinPEJobFactory(BaseJob, Logger, assert, util) {
    var logger = Logger.initialize(bootstrapWinPEJobFactory);

    /**
     *
     * @param {Object} options
     * @param {Object} context
     * @param {String} taskId
     * @constructor
     */
    function BootstrapWinPEJob(options, context, taskId) {
        BaseJob.call(this, logger, options, context, taskId);
        this.nodeId = this.context.target;
    }
    util.inherits(BootstrapWinPEJob, BaseJob);

    /**
     * @memberOf BootstrapWinPEJob
     */
    BootstrapWinPEJob.prototype._run = function() {
        this._subscribeRequestProfile(function() {
            return this.options.profile;
        });

        this._subscribeRequestProperties(function() {
            return this.options;
        });

        this._subscribeRequestCommands(function() {
            return {
                identifier: this.nodeId,
                tasks: [{ cmd: '' }]
            };
        });

        this._subscribeRespondCommands(function() {
            logger.info('Node is online and waiting for tasks', {
                id: this.context.target
            });

            this._done();
        });
    };

    return BootstrapWinPEJob;
}

