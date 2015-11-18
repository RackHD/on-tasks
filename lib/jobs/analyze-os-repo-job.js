// Copyright 2015, EMC, Inc.
/* jshint: node:true */

'use strict';

var di = require('di');

module.exports = analyzeOsRepoJobFactory;
di.annotate(analyzeOsRepoJobFactory, new di.Provide('Job.Os.Analyze.Repo'));
    di.annotate(analyzeOsRepoJobFactory,
    new di.Inject(
        'Job.Base',
        'Logger',
        'Assert',
        'Util',
        '_',
        'Promise',
        'JobUtils.OsRepoTool'
    )
);

function analyzeOsRepoJobFactory(
    BaseJob,
    Logger,
    assert,
    util,
    _,
    Promise,
    repoTool
) {
    var logger = Logger.initialize(analyzeOsRepoJobFactory);

    /**
     * This job will analyze the external OS repository, fetch some options from some repository
     * files and pass these options to shared context:
     * context.repoOptions  = { xxx: xxx }
     *
     * @param {Object} options
     * @param {Object} context
     * @param {String} taskId
     * @constructor
     */
    function AnalyzeOsRepoJob(options, context, taskId) {
        var self = this;
        AnalyzeOsRepoJob.super_.call(self, logger, options, context, taskId);

        self.nodeId = self.context.target;

        assert.string(self.options.osName);
        assert.string(self.options.repo);

        // Both http://xxx/repo and http://xxx/repo/ should be valid and point to same repository,
        // but our code prefer the previous one
        if (self.options.repo) {
            self.options.repo =  self.options.repo.trim();
            if (_.last(self.options.repo) === '/') {
                self.options.repo =  self.options.repo.substring(0, self.options.repo.length-1);
            }
        }
    }

    util.inherits(AnalyzeOsRepoJob, BaseJob);

    /**
     * @memberOf AnalyzeOsRepoJob
     */
    AnalyzeOsRepoJob.prototype._run = function() {
        var self = this;

        return Promise.resolve().then(function() {
            var handleFunc = self._findHandle(self.options.osName);
            return handleFunc.call(self, self.options.repo);
        }).then(function(result) {
            self.context.repoOptions = _.merge(
                result,
                {
                   //I add some smart conversion for 'repo' in constructor, so I want it be exposed
                   //to shared context to avoid duplicate conversion
                    repo: self.options.repo
                }
            );
            self._done();
        }).catch(function(error) {
            self._done(error);
            logger.error('fail to analyze the os repository', {
                error: error,
                osName: self.osName,
                repo: self.repo,
                nodeId: self.nodeId,
                context: self.context
            });
        });
    };

    /**
     * A function that can be used to provide a function with no operations or side effects
     * when lookup fails.
     *
     * @memberof AnalyzeOsRepoJob
     * @return {Function} A noop/empty function.
     * @private
     */
    AnalyzeOsRepoJob.prototype._noop = function() {};

    /**
     * find the handle function for current OS
     *
     * @memberof AnalyzeOsRepoJob
     * @param {String} osName - the name of target OS
     * @return {Function} the handle function for the input OS, if no function is defined, it will
     * return an empty function.
     */
    AnalyzeOsRepoJob.prototype._findHandle = function(osName) {
        var funcName = '_' + osName.toLowerCase() + 'Handle';
        var handleFunc = this[funcName];

        //Haven't defined a hanlding function for specified OS, it means it doesn't need to
        //analyze the OS repository, return an empty for fluent promise chain
        if (!handleFunc) {
            return AnalyzeOsRepoJob.prototype._noop;
        }

        if (!_.isFunction(handleFunc)) {
            throw(new Error('The handling for ' + osName + ' is not callable.'));
        }

        return handleFunc;
    };

    /**
     * Fetch the ESXi installation options from exteranl repository
     * @memberof AnalyzeOsRepoJob
     * @param {String} repo - the external repository address.
     * @return {Promise}
     */
    AnalyzeOsRepoJob.prototype._esxHandle = function (repo) {
        //first try the lower case because the installation has some problem when the repository
        //is in upper case, but anyway we will try the upper case as a retry, in future we (maybe
        //Vmware?) may have solution to fix the upper case problem.
        return repoTool.downloadViaHttp(repo + '/boot.cfg').catch(function() {
            return repoTool.downloadViaHttp(repo + '/BOOT.CFG');
        }).then(function(data) {
            var result = repoTool.parseEsxBootCfgFile(data, repo);

            //The following values are required for ESXi installation, add pre-checking for these
            //value to provide error message earlier than template rendering, the time advance
            //can be as much as 5-10min for some systems.
            var requiredKeys = ['tbootFile', 'mbootFile', 'moduleFiles'];
            _.forEach(requiredKeys, function(key) {
                if (!result || !result.hasOwnProperty(key) || !result[key] ||
                    !_.isString(result[key])) {
                        throw new Error('The value \'' + key + '\' from ESXi repository is either '+
                            'missing or its format is not correct');
                }
            });
            return result;
        });
    };

    return AnalyzeOsRepoJob;
}
