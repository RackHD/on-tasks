// Copyright 2014, Renasar Technologies Inc.
/* jshint: node:true */
'use strict';

var di = require('di');

module.exports = jobFactory;
di.annotate(jobFactory, new di.Provide('Job.noop'));
di.annotate(jobFactory, new di.Inject('Logger', 'Q'));
function jobFactory(Logger, Q) {
    var logger = Logger.initialize(jobFactory);
    function run() {
        logger.info("RUNNING NOOP JOB");
        return Q.delay(500);
    }

    function cancel() {
        logger.info("CANCELING NOOP JOB");
        return Q.delay(500);
    }

    return {
        run: run,
        cancel: cancel
    };
}
