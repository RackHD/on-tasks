// Copyright 2015, EMC, Inc.
/* jslint node: true */

'use strict';

var di = require('di');

module.exports = obmControlJobFactory;
di.annotate(obmControlJobFactory, new di.Provide('Job.Obm.Node'));
di.annotate(obmControlJobFactory, new di.Inject(
    'Job.Base',
    'Services.Waterline',
    'Logger',
    'Util',
    'Assert',
    'Errors',
    'Task.Services.OBM',
    '_',
    di.Injector
));
function obmControlJobFactory(
    BaseJob,
    waterline,
    Logger,
    util,
    assert,
    Errors,
    ObmService,
    _,
    injector
) {

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
        assert.ok(_.contains(_.methods(ObmService.prototype), this.options.action),
                'OBM action is a known action');
        // Defaults for this should have been set by the definition
        assert.ok(this.options.obmServiceName);

        this.nodeId = this.context.target;
        this.obmServiceName = this.options.obmServiceName;
    };
    util.inherits(ObmControlJob, BaseJob);

    /**
     * @memberOf ObmControlJob
     * @returns {Promise}
     */
    ObmControlJob.prototype._run = function () {
        var self = this;
        waterline.nodes.findByIdentifier(self.nodeId)
        .then(function (node) {
            assert.ok(node, "Node should exist to run OBM command");
            assert.ok(node.obmSettings, "Node should have OBM settings to run OBM command");

            var settings = _.find(node.obmSettings, function(setting) {
                return setting ? setting.service === self.obmServiceName : false;
            });

            assert.ok(settings, "Node should have OBM settings for service: " +
                self.obmServiceName);

            var obmServiceFactory = injector.get(self.options.obmServiceName);
            var obmService = ObmService.create(self.nodeId, obmServiceFactory,
                settings, self.options.delay, self.options.retries);

            self.killObm = function() {
                return obmService.kill();
            };

            return obmService[self.options.action]();
        })
        .then(function() {
            self._done();
        })
        .catch(function(e) {
            // If this is a JobKilledError that means a user has cancelled
            // the job externally, so we've called _cleanup and done(error) already.
            if (!(e instanceof Errors.JobKilledError)) {
                self._done(e);
            }
        });
    };

    ObmControlJob.prototype._cleanup = function() {
        if (_.isFunction(this.killObm)) {
            return this.killObm();
        }
    };

    return ObmControlJob;
}
