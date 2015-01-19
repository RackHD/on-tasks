// Copyright 2015, Renasar Technologies Inc.
/* jslint node: true */

'use strict';

var di = require('di');

module.exports = setPxeBootJobFactory;
di.annotate(setPxeBootJobFactory, new di.Provide('Job.node.setpxeboot'));
di.annotate(setPxeBootJobFactory, new di.Inject('Logger', 'Q', 'Assert', 'Services.OBM'));
function setPxeBootJobFactory(Logger, Q, assert, obmService) {

    var logger = Logger.initialize(setPxeBootJobFactory);

    /**
     *
     * @param {Object} options
     * @constructor
     */
    var SetPxeBootJob = function SetPxeBootJob(options) {
        assert.object(options);
        assert.string(options.nodeId);
        this.options = options;
    };

    /**
     * @memberOf SetPxeBootJob
     * @returns {Q.Promise}
     */
    SetPxeBootJob.prototype.run = function run() {
        logger.info("Running PowerOn Job for node ID "+this.options.nodeId);
        return obmService.powerOn(this.options.nodeId);
    };

    /**
     * @memberOf SetPxeBootJob
     * @returns {Q.Promise}
     */
    SetPxeBootJob.prototype.cancel = function cancel() {
        return Q.reject("Cancel for poweron not implemented");
    };

    /**
     * static creator
     * @param {Object} [options]
     */
    SetPxeBootJob.create = function(options) {
        return new SetPxeBootJob(options);
    };

    return SetPxeBootJob;
}
