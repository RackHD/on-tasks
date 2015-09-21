// Copyright 2015, EMC, Inc.
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
        '_'
    )
);

function installOsJobFactory(
    BaseJob,
    Logger,
    assert,
    util,
    _
) {
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
        InstallOsJob.super_.call(self, logger, options, context, taskId);

        assert.string(this.context.target);
        assert.string(this.options.completionUri);
        assert.string(this.options.profile);

        // Some of the install task (such as coreos) still hard coded the repo in
        // the profile/kickstart file, So we cannot assert repo&version here
        //
        // TODO: If all install tasks use the options 'repo' & 'version',
        // then uncomment following two lines:
        // assert.string(this.options.repo);
        // assert.string(this.options.version);

        self.nodeId = self.context.target;
        self.profile = self.options.profile;
    }
    util.inherits(InstallOsJob, BaseJob);

    /**
     * @memberOf InstallOsJob
     */
    InstallOsJob.prototype._run = function() {
        this._subscribeRequestProfile(function() {
            return this.profile;
        });

        this._subscribeRequestProperties(function() {
            return this.options;
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
