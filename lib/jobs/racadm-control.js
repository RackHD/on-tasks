// Copyright 2016, EMC, Inc.

'use strict';

var di = require('di');

module.exports = racadmToolJobFactory;
di.annotate(racadmToolJobFactory, new di.Provide('Job.Dell.RacadmTool'));
di.annotate(racadmToolJobFactory, new di.Inject(
    'Job.Base',
    'JobUtils.RacadmTool',
    'Logger',
    'Util',
    'Assert',
    'Promise',
    '_',
    'Services.Encryption',
    'Services.Lookup',
    'Constants',
    'Services.Waterline'
));

function racadmToolJobFactory(
    BaseJob,
    racadmTool,
    Logger,
    util,
    assert,
    Promise,
    _,
    encryption,
    lookup,
    Constants,
    waterline
) {
    var logger = Logger.initialize(racadmToolJobFactory);
    /**
     *
     * @param {Object} options
     * @param {Object} context
     * @param {String} taskId
     * @constructor
     */
    function RacadmToolJob(options, context, taskId) {
        RacadmToolJob.super_.call(this, logger, options, context, taskId);

        this.nodeId = this.context.target;
        this.action = options.action;
        this.userConfig = {user: options.serverUsername, password: options.serverPassword, 
            filePath: options.serverFilePath};
        if (typeof options.forceReboot !== "undefined") {
            this.userConfig.forceReboot = options.forceReboot;
        }
    }
    util.inherits(RacadmToolJob, BaseJob);

    /**
     * @memberOf RacadmToolJob
     */
    RacadmToolJob.prototype._run = function() {
        var self = this;
        return waterline.obms.findByNode(self.nodeId, 'ipmi-obm-service', true)
            .then(function (obmSettings) {
                return obmSettings.config;
            })
            .then(self.lookupHost)
            .then(function(obmSetting) {
                assert.func(racadmTool[self.action]);
                return racadmTool[self.action](obmSetting.host, obmSetting.user,
                    obmSetting.password,
                    self.userConfig);
            })
            .then(function(results){
                if (results.status){
                    logger.debug(results.status);
                }else{
                logger.debug(results);
                }
                self._done();
            })
            .catch(function(err) {
                self._done(err);
            });

    };

    RacadmToolJob.prototype.lookupHost = function lookupHost (options) {
        if (options.host && Constants.Regex.MacAddress.test(options.host)) {
            return lookup.macAddressToIp(options.host).then(function (ipAddress) {
                options.host = ipAddress;
                return options;
            });
        }

        return options;
    };
    return RacadmToolJob;
}
