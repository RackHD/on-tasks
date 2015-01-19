// Copyright 2015, Renasar Technologies Inc.
/* jslint node: true */

'use strict';

var di = require('di');

module.exports = poweroffJobFactory;
di.annotate(poweroffJobFactory, new di.Provide('Job.node.poweroff'));
di.annotate(poweroffJobFactory, new di.Inject('Logger', 'Q', 'Assert', 'Services.OBM'));
function poweroffJobFactory(Logger, Q, assert, obmService) {

    var logger = Logger.initialize(poweroffJobFactory);

    /**
     *
     * @param {Object} options
     * @constructor
     */
    var PowerOffJob = function PowerOffJob(options) {
        assert.object(options);
        assert.string(options.nodeId);
        this.options = options;
    };

    /**
     * @memberOf PowerOffJob
     * @returns {Q.Promise}
     */
    PowerOffJob.prototype.run = function run() {
        logger.info("Running PowerOn Job for node ID "+this.options.nodeId);
        return obmService.powerOff(this.options.nodeId);
    };

    /**
     * @memberOf PowerOffJob
     * @returns {Q.Promise}
     */
    PowerOffJob.prototype.cancel = function cancel() {
        return Q.reject("Cancel for poweron not implemented");
    };

    /**
     * static creator
     * @param {Object} [options]
     */
    PowerOffJob.create = function(options) {
        return new PowerOffJob(options);
    };


    return PowerOffJob;
}
