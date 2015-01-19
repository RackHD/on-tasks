// Copyright 2015, Renasar Technologies Inc.
/* jslint node: true */

'use strict';

var di = require('di');

module.exports = poweronJobFactory;
di.annotate(poweronJobFactory, new di.Provide('Job.node.poweron'));
di.annotate(poweronJobFactory, new di.Inject('Logger', 'Q', 'Assert', 'Services.OBM'));
function poweronJobFactory(Logger, Q, assert, obmService) {

    var logger = Logger.initialize(poweronJobFactory);

    /**
     *
     * @param {Object} options
     * @constructor
     */
    var PowerOnJob = function PowerOnJob(options) {
        assert.object(options);
        assert.string(options.nodeId);
        this.options = options;
    };

    /**
     * @memberOf PowerOnJob
     * @returns {Q.Promise}
     */
    PowerOnJob.prototype.run = function run() {
        logger.info("Running PowerOn Job for node ID "+this.options.nodeId);
        return obmService.powerOn(this.options.nodeId);
    };

    /**
     * @memberOf PowerOnJob
     * @returns {Q.Promise}
     */
    PowerOnJob.prototype.cancel = function cancel() {
        return Q.reject("Cancel for poweron not implemented");
    };

    /**
     * static creator
     * @param {Object} [options]
     */
    PowerOnJob.create = function(options) {
        return new PowerOnJob(options);
    };


    return PowerOnJob;
}
