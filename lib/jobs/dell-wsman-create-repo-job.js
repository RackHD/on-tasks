//Copyright 2016, EMC, Inc.

'use strict';

var di = require('di');

module.exports = wsmanCreateRepoJobFactory;
di.annotate(wsmanCreateRepoJobFactory, new di.Provide('Job.Dell.Wsman.Create.Repo'));
di.annotate(wsmanCreateRepoJobFactory, new di.Inject(
    'Job.Dell.Wsman.Base',
    'Logger',
    'Util',
    'Assert',
    'Errors',
    'Promise',
    '_',
    'Services.Encryption',
    'Services.Lookup',
    'Constants',
    'Services.Waterline',
    'Services.Configuration',
    'JobUtils.WsmanTool'
));

function wsmanCreateRepoJobFactory(
        BaseJob,
        Logger,
        util,
        assert,
        errors,
        Promise,
        _,
        encryption,
        lookup,
        Constants,
        waterline,
        configuration,
        WsmanTool
)
{
    var logger = Logger.initialize(wsmanCreateRepoJobFactory);
    /**
     *
     * @param {Object} options
     * @param {Object} context
     * @param {String} taskId
     * @constructor
     */
    function WsmanCreateRepoJob(options, context, taskId) {
        WsmanCreateRepoJob.super_.call(this, logger, options, context, taskId);
        this.action = options.action;
        this.dellConfigs = undefined;
        this.apiServerConfig=undefined;

        this.catalogFilePath=options.catalogFilePath;
        this.targetFilePath=options.targetFilePath;
        this.updates=options.updates;
    }

    util.inherits(WsmanCreateRepoJob, BaseJob);

    /*
     *  Initialize basic configuration for the job
     *
     */
    WsmanCreateRepoJob.prototype._initJob = function () {
        var self = this;

        self.dellConfigs = configuration.get('dell');
        if (!self.dellConfigs || !self.dellConfigs.services.firmware) {
            throw new errors.NotFoundError('Dell FirmwareUpdate web service is not defined in smiConfig.json.'); //jshint ignore:line
        }
        self.apiServerConfig =self.dellConfigs.services.firmware;
    };

    /*
     *    Create custom firmware repository
     */
    WsmanCreateRepoJob.prototype._handleSyncRequest = function(){
        logger.info('creating custome DUPS for firmware update');

        var self=this;
        var apiHost=self.dellConfigs.gateway;
        var path=self.apiServerConfig.custom;
        var method='POST';
        var updates=self.updates;

        var data= {
                "catalogFilePath":self.catalogFilePath,
                "targetFilePath" :self.targetFilePath,
                "updates":updates
        };

        var wsman= new WsmanTool(apiHost);
        return wsman.clientRequest(path,method,data);
    };

    return WsmanCreateRepoJob;
}
