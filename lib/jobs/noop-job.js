// Copyright 2014-2015, Renasar Technologies Inc.
/* jshint: node:true */
'use strict';

var di = require('di');

module.exports = noOpJobFactory;
di.annotate(noOpJobFactory, new di.Provide('Job.noop'));
di.annotate(noOpJobFactory, new di.Inject('Logger', 'Q'));
function noOpJobFactory(Logger, Q) {

    var logger = Logger.initialize(noOpJobFactory);

    /**
     *
     * @param {Object} [options]
     * @constructor
     */
    var NoOpJob = function (options, context, taskId) {
        this.options = options;
        this.context = context;
        this.taskId = taskId;
    };

    /**
     * @memberOf NoOpJob
     * @returns {Q.Promise}
     */
    NoOpJob.prototype.run = function run() {
        logger.info("RUNNING NOOP JOB");
        return Q.delay(500);
    };

    /**
     * @memberOf NoOpJob
     * @returns {Q.Promise}
     */
    NoOpJob.prototype.cancel = function cancel() {
        logger.info("CANCELING NOOP JOB");
        return Q.delay(500);
    };

    /**
     * static creator
     * @param {Object} [options]
     */
    NoOpJob.create = function(options, context, taskId) {
        return new NoOpJob(options, context, taskId);
    };

    return NoOpJob;
}
