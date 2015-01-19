// Copyright 2015, Renasar Technologies Inc.
/* jslint node: true */

'use strict';

var di = require('di');

module.exports = rebootJobFactory;
di.annotate(rebootJobFactory, new di.Provide('Job.node.reboot'));
di.annotate(rebootJobFactory, new di.Inject('Logger', 'Q', 'Assert', 'Services.OBM'));
function rebootJobFactory(Logger, Q, assert, obmService) {

    var logger = Logger.initialize(rebootJobFactory);

    /**
     *
     * @param {Object} options
     * @constructor
     */
    var RebootJob = function RebootJob(options) {
        assert.object(options);
        assert.string(options.nodeId);
        this.options = options;
    };

    /**
     * @memberOf RebootJob
     * @returns {Q.Promise}
     */
    RebootJob.prototype.run = function run() {
        logger.info("Running PowerOn Job for node ID "+this.options.nodeId);
        return obmService.reboot(this.options.nodeId);
    };

    /**
     * @memberOf RebootJob
     * @returns {Q.Promise}
     */
    RebootJob.prototype.cancel = function cancel() {
        return Q.reject("Cancel for poweron not implemented");
    };

    /**
     * static creator
     * @param {Object} [options]
     */
    RebootJob.create = function(options) {
        return new RebootJob(options);
    };


    return RebootJob;
}
