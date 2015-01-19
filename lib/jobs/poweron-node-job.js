// Copyright 2015, Renasar Technologies Inc.
/* jslint node: true */

'use strict';

var di = require('di');

module.exports = poweronJobFactory;
di.annotate(poweronJobFactory, new di.Provide('Job.node.poweron'));
di.annotate(poweronJobFactory, new di.Inject('Logger', 'Q', 'Assert', 'Service.OBM'));
function poweronJobFactory(Logger, Q, assert, obmService) {

    var logger = Logger.initialize(poweronJobFactory);

    var PowerOnJob = function PowerOnJob(options) {
        assert.object(options);
        assert.string(options.nodeId);
        this.options = options;
    };

    PowerOnJob.prototype.run = function run() {
        logger.info("Running PowerOn Job for node ID "+this.options.nodeId);
        return obmService.powerOn(this.options.nodeId);
    };

    PowerOnJob.prototype.cancel = function cancel() {
        return Q.reject("Cancel for poweron not implemented");
    };

    return PowerOnJob;
}
