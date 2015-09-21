// Copyright 2015, EMC, Inc.
/* jshint: node:true */

'use strict';

var di = require('di');

module.exports = zerotouchJobFactory;
di.annotate(zerotouchJobFactory, new di.Provide('Job.Arista.Zerotouch'));
    di.annotate(zerotouchJobFactory,
    new di.Inject(
        'Job.Base',
        'Templates',
        'Logger',
        'Assert',
        'Util',
        '_'
    )
);
function zerotouchJobFactory(BaseJob, templates, Logger, assert, util, _) {
    var logger = Logger.initialize(zerotouchJobFactory);

    /**
     *
     * @param {Object} options
     * @param {Object} context
     * @param {String} taskId
     * @constructor
     */
    function ZerotouchJob(options, context, taskId) {
        ZerotouchJob.super_.call(this, logger, options, context, taskId);

        assert.string(this.context.target);
        assert.string(this.options.eosImage);
        assert.string(this.options.startupConfig);
        assert.string(this.options.bootConfig);
        assert.string(this.options.bootfile);
        assert.string(this.options.profile);

        this.options.profile = options.profile || 'zerotouch-configure.zt';
        this.nodeId = this.context.target;
    }
    util.inherits(ZerotouchJob, BaseJob);

    /**
     * @memberOf ZerotouchJob
     */
    ZerotouchJob.prototype._run = function() {
        var self = this;
        return templates.get(self.options.startupConfig)
        .then(function(startupConfig) {
            if (!startupConfig) {
                self._done(new Error("Startup config does not exist in templates"));
                return 'failed';
            }
            return templates.get(self.options.bootConfig);
        })
        .then(function(bootConfig) {
            if (bootConfig === 'failed') {
                return;
            }
            if (!bootConfig) {
                self._done(new Error("Boot config does not exist in templates"));
                return 'failed';
            }
        })
        .then(function(failed) {
            if (failed === 'failed') {
                return;
            }
            self._subscribeRequestProfile(function() {
                return self.options.profile;
            });
            self._subscribeRequestProperties(function() {
                return self.options;
            });
            self._subscribeHttpResponse(function(data) {
                assert.object(data);
                if (199 < data.statusCode && data.statusCode < 300) {
                    if(_.contains(data.url, self.options.eosImage)) {
                        self._done();
                    }
                }
            });
        })
        .catch(function(e) {
            self._done(e);
        });
    };

    return ZerotouchJob;
}
