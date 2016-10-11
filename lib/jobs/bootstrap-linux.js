// Copyright 2015, EMC, Inc.

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
        assert.string(options.kernelFile);
        assert.string(options.kernelUri);
        assert.string(options.initrdFile);
        assert.string(options.initrdUri);

        if (options.triggerGroup) {
            assert.string(options.triggerGroup);
            assert.uuid(context.graphId);
            this.triggerGroup = options.triggerGroup;
            this.routingKey = context.graphId;
        }

        this.nodeId = this.context.target;
        this.profile = this.options.profile;
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
            return this.options;
        });

        // This job can be configured to run indefinitely and complete only
        // when told to, or to complete the first time a request for tasks
        // is made by the node after netbooting.
        if (this.triggerGroup) {
            this._subscribeFinishTrigger(this.routingKey, this.triggerGroup, function() {
                this._done();
            });
        } else {
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
        }
    };

    return BootstrapLinuxJob;
}
