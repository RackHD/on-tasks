// Copyright 2016, EMC, Inc.

'use strict';

var di = require('di');


module.exports = bmcPasswordJobFactory;
di.annotate(bmcPasswordJobFactory, new di.Provide('Job.BMC.Password'));
di.annotate(bmcPasswordJobFactory, new di.Inject(
    'Job.Base',
    'Logger',
    'Util',
    'uuid',
    'Promise',
    'crypto'
));
function bmcPasswordJobFactory(BaseJob, Logger, util, uuid, Promise,crypto) {

    var logger = Logger.initialize(bmcPasswordJobFactory);

    /**
     *
     * @param {Object} options
     * @param {Object} context
     * @param {String} taskId
     * @constructor
     */
    function BmcPasswordJob(options, context, taskId) {
        BmcPasswordJob.super_.call(this, logger, options, context, taskId);
    }

    util.inherits(BmcPasswordJob, BaseJob);

    /**
     * @memberOf BmcPasswordJob
     */
    BmcPasswordJob.prototype._run = function _run() {
        var self = this;

        var token = crypto.randomBytes(4).toString('hex');
        this.context.password = this.context.password || token;
        self._done();
    };

    return BmcPasswordJob;
}
