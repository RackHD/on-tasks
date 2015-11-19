// Copyright 2015, EMC, Inc.

'use strict';

var di = require('di');

module.exports = createObmSettingsJobFactory;
di.annotate(createObmSettingsJobFactory, new di.Provide('Job.Obm.CreateSettings'));
di.annotate(createObmSettingsJobFactory, new di.Inject(
    'Job.Base',
    'Services.Waterline',
    'Task.Services.OBM',
    'Logger',
    'Assert',
    'Util',
    di.Injector
));
function createObmSettingsJobFactory(
    BaseJob,
    waterline,
    ObmService,
    Logger,
    assert,
    util,
    injector
) {

    var logger = Logger.initialize(createObmSettingsJobFactory);

    /**
     *
     * @param {Object} options
     * @param {Object} context
     * @param {String} taskId
     * @constructor
     */
    var ObmSettingsJob = function ObmControlJob(options, context, taskId) {
        ObmControlJob.super_.call(this, logger, options, context, taskId);
        assert.string(this.options.service);
        assert.object(this.options.config);
        assert.string(this.context.target);

        this.obmSettings = {
            service: this.options.service,
            config: this.options.config
        };
        this.nodeId = this.context.target;
    };
    util.inherits(ObmSettingsJob, BaseJob);

    /**
     * @memberOf ObmSettingsJob
     * @returns {Promise.Promise}
     */
    ObmSettingsJob.prototype._run = function run() {
        var self = this;

        var updateQuery = {
            obmSettings: [ self.obmSettings ]
        };

        return waterline.nodes.updateByIdentifier(this.nodeId, updateQuery)
        .then(function() {
            return self.liveTestObmConfig();
        })
        .then(function() {
            self._done();
        })
        .catch(function(e) {
            self._done(e);
        });
    };

    ObmSettingsJob.prototype.liveTestObmConfig = function liveTestIpmiConfig() {
        var obmServiceFactory = injector.get(this.options.service);
        var obmRequestor = ObmService.create(this.nodeId, obmServiceFactory, this.obmSettings);
        return obmRequestor.powerStatus();
    };

    return ObmSettingsJob;
}
