// Copyright 2016, EMC, Inc.
'use strict';

var di = require('di');

module.exports = waitCompletionUri;
di.annotate(waitCompletionUri, new di.Provide('Job.Wait.Completion.Uri'));
di.annotate(waitCompletionUri,
    new di.Inject(
        'Job.Base',
        'Logger',
        'Assert',
        'Util',
        '_',
        'Promise'
    )
);

function waitCompletionUri(
    BaseJob,
    Logger,
    assert,
    util,
    _,
    Promise
) {
    var logger = Logger.initialize(waitCompletionUri);

    /**
     *
     * @param {Object} options
     * @param {Object} context
     * @param {String} taskId
     * @constructor
     */
    function WaitCompletionUri(options, context, taskId) {
        var self = this;
        WaitCompletionUri.super_.call(self, logger, options, context, taskId);
        assert.string(this.options.completionUri);
        self.nodeId = self.context.target;
    }
    util.inherits(WaitCompletionUri, BaseJob);

    /**
     * @memberOf InstallOsJob
     */
    WaitCompletionUri.prototype._run = function() {
        var self = this;
        return Promise.resolve().then(function() {
            self._subscribeRequestProperties(function() {
                return self.options;
            });
            
            self._subscribeHttpResponse(function(data) {
                assert.object(data);
                if (199 < data.statusCode && data.statusCode < 300) {
                    if(_.contains(data.url, self.options.completionUri)) {
                        self._done();
                    }
                }
            });
        }).catch(function(err) {
            logger.error('Fail to run wait for completion uri', {
                node: self.nodeId,
                error: err,
                options: self.options
            });
            self._done(err);
        });
    };

    return WaitCompletionUri;
}
