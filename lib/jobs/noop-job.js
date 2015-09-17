// Copyright 2015, EMC, Inc.
/* jshint: node:true */
'use strict';

var di = require('di');

module.exports = noOpJobFactory;
di.annotate(noOpJobFactory, new di.Provide('Job.noop'));
di.annotate(noOpJobFactory, new di.Inject('Job.Base', 'Logger', 'Util', 'uuid', 'Q'));
function noOpJobFactory(BaseJob, Logger, util, uuid, Q) {
    var logger = Logger.initialize(noOpJobFactory);

    /**
     *
     * @param {Object} options
     * @param {Object} context
     * @param {String} taskId
     * @constructor
     */
    function NoOpJob(options, context, taskId) {
        options = options || {};
        context = context || {};
        taskId = taskId || uuid.v4();

        NoOpJob.super_.call(this, logger, options, context, taskId);
    }

    util.inherits(NoOpJob, BaseJob);

    /**
     * @memberOf NoOpJob
     */
    NoOpJob.prototype._run = function run() {
        var self = this;
        logger.info("RUNNING NOOP JOB");
        Q.delay().then(function() {
            self._done();
        });
    };

    return NoOpJob;
}
