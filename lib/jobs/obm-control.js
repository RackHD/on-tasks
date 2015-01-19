// Copyright 2015, Renasar Technologies Inc.
/* jslint node: true */

'use strict';

var di = require('di');

module.exports = obmControlJobFactory;
di.annotate(obmControlJobFactory, new di.Provide('Job.Obm.Node'));
di.annotate(obmControlJobFactory, new di.Inject('Logger', 'Q', 'Assert', 'Task.Services.OBM', '_'));
function obmControlJobFactory(Logger, Q, assert, obmService, _) {
    var logger = Logger.initialize(obmControlJobFactory);

    /**
     *
     * @param {Object} options
     * @constructor
     */
    var ObmControlJob = function PowerOnJob(options, context) {
        assert.object(options);
        assert.string(context.target);
        assert.string(options.action);
        assert.ok(_.contains(_.methods(obmService), options.action),
                'OBM action is a known action');

        this.options = options;
        this.nodeId = this.options.target;
    };

    /**
     * @memberOf RebootJob
     * @returns {Q.Promise}
     */
    ObmControlJob.prototype.run = function run() {
        logger.info("Running reboot job for node.", {
            id: this.nodeId
        });
        return obmService[this.options.action](this.nodeId);
    };

    /**
     * @memberOf RebootJob
     * @returns {Q.Promise}
     */
    ObmControlJob.prototype.cancel = function cancel() {
        return Q.reject(new Error("Cancel for reboot job not implemented"));
    };

    /**
     * static creator
     * @param {Object} [options]
     */
    ObmControlJob.create = function(options, context) {
        return new ObmControlJob(options, context);
    };


    return ObmControlJob;
}
