// Copyright 2015, EMC, Inc.

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

        assert.string(this.options.action, 'action');
        assert.ok(_.contains(_.methods(ObmService.prototype), this.options.action),
                'OBM action is a known action');

        this.nodeId = this.context.target || this.options.nodeId;
        assert.string(this.nodeId, 'nodeId');
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

            if (self.obmServiceName) {
                self.settings = _.find(node.obmSettings, function(setting) {
                    return setting ? setting.service === self.obmServiceName : false;
                });
                // throw error if the exact obm service doesn't exist
                assert.ok(self.settings, "Node should have OBM settings for service: " +
                    self.obmServiceName);
            } else {
                //find the default obm service
                if(node.obmSettings.length === 0){
                    throw new Error("No OBM service assigned to this node.");
                }
                if(node.obmSettings.length === 1) {
                    self.settings = node.obmSettings[0];
                    logger.debug("Defaulting to obmServiceName "+ self.settings.service +
                        " for node because only one OBM service present.");
                } else {
                    throw new Error("More than one OBM service assigned to this node." +
                        " (no default set for which to use)");
                }
            }

            var obmServiceFactory = injector.get(self.settings.service);
            var obmService = ObmService.create(
                self.nodeId,
                obmServiceFactory,
                self.settings,
                self.options
            );

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
