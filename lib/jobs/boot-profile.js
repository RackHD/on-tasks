// Copyright 2016, EMC, Inc.

'use strict';

var di = require('di');

module.exports = bootProfileJobFactory;
di.annotate(bootProfileJobFactory, new di.Provide('Job.BootProfile'));
di.annotate(bootProfileJobFactory,
    new di.Inject(
        'Job.Base',
        'Logger',
        'Assert',
        'Util'
    )
);
function bootProfileJobFactory(BaseJob, Logger, assert, util) {
    var logger = Logger.initialize(bootProfileJobFactory);

    /**
     * NOTE: Due to the way our boilerplate.ipxe script works, this job
     * will not work if run as the final task within a workflow (boilerplate.ipxe
     * causes ipxe to make additional DHCP requests prior to actually
     * running the ipxe script we've served down, and those requests will get
     * ignored if there is no currently active workflow for the node.
     *
     * @param {Object} options
     * @param {Object} context
     * @param {String} taskId
     * @constructor
     */
    function BootProfileJob(options, context, taskId) {
        BootProfileJob.super_.call(this, logger, options, context, taskId);
        this.nodeId = this.context.target;
        assert.string(this.nodeId, 'context.target (nodeId)');
        this.profile = this.options.profile;
        assert.string(this.profile, 'options.profile');
    }
    util.inherits(BootProfileJob, BaseJob);

    BootProfileJob.prototype._run = function () {
        var self = this;

        self._subscribeRequestProfile(function () {
            return self.profile;
        });

        self._subscribeRequestProperties(function () {
            self._done();
            return self.options;
        });
    };

    return BootProfileJob;
}
