// Copyright © 2017 Dell Inc. or its subsidiaries.  All Rights Reserved.

'use strict';

var di = require('di');

module.exports = downloadFileJobFactory;
di.annotate(downloadFileJobFactory, new di.Provide('Job.Download.File'));
di.annotate(downloadFileJobFactory,
    new di.Inject(
        'Job.Base',
        'Logger',
        'Assert',
        'Util',
        '_',
        'Promise',
        'ChildProcess'
    )
);

function downloadFileJobFactory(BaseJob,
                                Logger,
                                assert,
                                util,
                                _,
                                Promise,
                                ChildProcess) {
    var logger = Logger.initialize(downloadFileJobFactory);

    /**
     * This job will fetch a file from some repository
     *
     * @param {Object} options
     * @param {Object} context
     * @param {String} taskId
     * @constructor
     */
    function DownloadFileJob(options, context, taskId) {
        var self = this;
        DownloadFileJob.super_.call(self, logger, options, context, taskId);

        self.nodeId = self.context.target;

        if (self.options.filePath) {
            self.options.filePath = self.options.filePath.trim();
            if (_.last(self.options.filePath) === '/') {
                self.options.filePath = self.options.filePath.substring(0, self.options.filePath.length - 1);
            }
        }
    }

    util.inherits(DownloadFileJob, BaseJob);

    /**
     * @memberOf DownloadFileJob
     */
    DownloadFileJob.prototype._run = function () {
        var self = this;
        if (self.options.filePath && self.options.filePath.toLowerCase().startsWith('http')) {
            return Promise.resolve()
                .then(function () {
                    var childProcess = new ChildProcess(
                        'wget',
                        [self.options.filePath]
                    );
                    return childProcess.run({retries: 0, delay: 0});
                }).then(function () {
                    self._done();
                }).catch(function (error) {
                    self._done(error);
                    logger.error('failed to get file', {
                        error: error,
                        filePath: self.filePath,
                        nodeId: self.nodeId,
                        context: self.context
                    });
                });
        } else {
            return Promise.resolve()
                .then(function () {
                    self._done();
                });
        }
    };
    return DownloadFileJob;
}
