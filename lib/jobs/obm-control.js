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
        assert.string(context.target);
        assert.string(options.action);
        assert.ok(_.contains(_.methods(obmService), options.action),
                'OBM action is a known action');

        this.options = options;
        this.context = context;
        this.logger = logger;
        this.taskId = taskId;
        this.nodeId = this.context.target;

        ObmControlJob.super_.call(this);
    };
    util.inherits(ObmControlJob, BaseJob);

    /**
     * @memberOf ObmControlJob
     * @returns {Q.Promise}
     */
    ObmControlJob.prototype._run = function run() {
        var self = this;
        logger.info("Running obm job for node.", {
            id: self.nodeId
        });
        obmService[self.options.action](self.nodeId).then(function() {
            self._done();
        }).catch(function(e) {
            self.cancel(e);
        });
    };

    return ObmControlJob;
}
