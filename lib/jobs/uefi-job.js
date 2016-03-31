// Copyright 2016, EMC, Inc.

'use strict';

var di = require('di');

module.exports = uefiJobFactory;
di.annotate(uefiJobFactory, new di.Provide('Job.Uefi'));
di.annotate(uefiJobFactory,
    new di.Inject(
        'Job.Base',
        'Logger',
        'Assert',
        'Util'
    )
);
function uefiJobFactory(BaseJob, Logger, assert, util) {
    var logger = Logger.initialize(uefiJobFactory);

    /**
     *
     * @param {Object} options
     * @param {Object} context
     * @param {String} taskId
     * @constructor
     */
    function UefiJob(options, context, taskId) {
        UefiJob.super_.call(this, logger, options, context, taskId);
        assert.string(options.uefitool);
        assert.string(options.repo);
        this.nodeId = this.context.target;
        this.profile = this.options.profile;
    }
    util.inherits(UefiJob, BaseJob);

    UefiJob.prototype._run = function () {
        var self = this;
        self._subscribeRequestProfile(function () {
            return self.profile;
        });

        self._subscribeRequestProperties(function () {
            return self.options;
        });

        self._subscribeHttpResponse(function (data) {
            assert.object(data);
            if (199 < data.statusCode && data.statusCode < 300) {
                if (data.url.indexOf(self.options.uefitool) > 0) {
                    self._done();
                }
            }
        });
    };

    return UefiJob;
}
