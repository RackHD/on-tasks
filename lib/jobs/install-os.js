// Copyright 2014, Renasar Technologies Inc.
/* jshint: node:true */

'use strict';

var di = require('di');

module.exports = installOsJobFactory;
di.annotate(installOsJobFactory, new di.Provide('Job.Os.Install'));
    di.annotate(installOsJobFactory,
    new di.Inject(
        'Job.Base',
        'Logger',
        'Assert',
        'Util',
        'Q',
        '_'
    )
);
function installOsJobFactory(BaseJob, Logger, assert, util, Q, _) {
    var logger = Logger.initialize(installOsJobFactory);

    /**
     *
     * @param {Object} options
     * @param {Object} context
     * @param {String} taskId
     * @constructor
     */
    function InstallOsJob(options, context, taskId) {
        var self = this;

        assert.string(context.target);
        assert.string(options.completionUri);
        assert.string(options.profile);

        self.options = options;
        self.context = context;
        self.taskId = taskId;
        self.logger = logger;
        self.nodeId = self.context.target;
        self.profile = self.options.profile;
        self.osProperties = {};
        // All potential properties used by linux and esx installers
        var validProperties = ['username',
                                'password',
                                'uid',
                                'hostname',
                                'domain',
                                'esxBootConfigTemplate'];
        _.forEach(validProperties, function(prop) {
            if (_.has(self.options, prop)) {
                self.osProperties[prop] = self.options[prop];
            }
        });

        InstallOsJob.super_.call(this);
    }
    util.inherits(InstallOsJob, BaseJob);

    /**
     * @memberOf InstallOsJob
     */
    InstallOsJob.prototype._run = function() {
        logger.info("Running install os job.", {
            id: this.nodeId,
            options: this.options
        });

        this._subscribeRequestProfile(function() {
            return this.profile;
        });

        this._subscribeRequestProperties(function() {
            return this.osProperties;
        });

        this._subscribeHttpResponse(function(data) {
            assert.object(data);
            if (199 < data.statusCode && data.statusCode < 300) {
                if(_.contains(data.url, this.options.completionUri)) {
                    this._done();
                }
            }
        });
    };

    return InstallOsJob;
}
