// Copyright 2015, Renasar Technologies Inc.
/* jslint node: true */

'use strict';

var di = require('di');

module.exports = obmControlJobFactory;
di.annotate(obmControlJobFactory, new di.Provide('Job.Obm.Node'));
di.annotate(obmControlJobFactory, new di.Inject('Job.Base', 'Logger',
            'Util', 'Q', 'Assert', 'Task.Services.OBM', '_'));
function obmControlJobFactory(BaseJob, Logger, util, Q, assert, obmService, _) {
    var logger = Logger.initialize(obmControlJobFactory);

    /**
     *
     * @param {Object} options
     * @param {Object} context
     * @param {String} taskId
     * @constructor
     */
    var ObmControlJob = function ObmControlJob(options, context, taskId) {
        ObmControlJob.super_.call(this, logger, options, context, taskId);

        assert.string(this.context.target);
        assert.string(this.options.action);
        assert.ok(_.contains(_.methods(obmService), this.options.action),
                'OBM action is a known action');

        this.nodeId = this.context.target;
    };
    util.inherits(ObmControlJob, BaseJob);

    /**
     * @memberOf ObmControlJob
     * @returns {Q.Promise}
     */
    ObmControlJob.prototype._run = function run() {
        var self = this;
        obmService[self.options.action](self.nodeId).then(function() {
            self._done();
        }).catch(function(e) {
            self.cancel(e);
        });
    };

    return ObmControlJob;
}
