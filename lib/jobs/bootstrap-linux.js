// Copyright 2014, Renasar Technologies Inc.
/* jshint: node:true */

'use strict';

var di = require('di');

module.exports = bootstrapLinuxJobFactory;
di.annotate(bootstrapLinuxJobFactory, new di.Provide('Job.Linux.Bootstrap'));
    di.annotate(bootstrapLinuxJobFactory,
    new di.Inject(
        'Job.Base',
        'Logger',
        'Assert',
        'Util'
    )
);
function bootstrapLinuxJobFactory(BaseJob, Logger, assert, util) {
    var logger = Logger.initialize(bootstrapLinuxJobFactory);

    /**
     *
     * @param {Object} options
     * @param {Object} context
     * @param {String} taskId
     * @constructor
     */
    function BootstrapLinuxJob(options, context, taskId) {
        BootstrapLinuxJob.super_.call(this, logger, options, context, taskId);

        assert.string(context.target);
        assert.string(options.kernelversion);
        assert.string(options.kernel);
        assert.string(options.initrd);
        assert.string(options.basefs);
        assert.string(options.overlayfs);

        this.nodeId = this.context.target;
        this.profile = this.options.profile;
        this.bootProperties = {
            kernelversion: this.options.kernelversion,
            kernel: this.options.kernel,
            initrd: this.options.initrd,
            basefs: this.options.basefs,
            overlayfs: this.options.overlayfs
        };
    }
    util.inherits(BootstrapLinuxJob, BaseJob);

    /**
     * @memberOf BootstrapLinuxJob
     */
    BootstrapLinuxJob.prototype._run = function() {
        this._subscribeRequestProfile(function() {
            return this.profile;
        });

        this._subscribeRequestProperties(function() {
            return this.bootProperties;
        });

        this._subscribeRequestCommands(function() {
            return {
                identifier: this.nodeId,
                tasks: [{ cmd: '' }]
            };
        });

        this._subscribeRespondCommands(function() {
            logger.info("Node is online and waiting for tasks", {
                id: this.nodeId
            });
            this._done();
        });
    };

    return BootstrapLinuxJob;
}
