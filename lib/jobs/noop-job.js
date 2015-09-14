// Copyright 2014-2015, Renasar Technologies Inc.
/* jshint: node:true */
'use strict';

var di = require('di');

module.exports = noOpJobFactory;
di.annotate(noOpJobFactory, new di.Provide('Job.noop'));
di.annotate(noOpJobFactory, new di.Inject('Job.Base', 'Logger', 'Util', 'uuid', 'Promise'));
function noOpJobFactory(BaseJob, Logger, util, uuid, Promise) {
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
        Promise.delay().then(function() {
            self._done();
        });
    };

    return NoOpJob;
}
