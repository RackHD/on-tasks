//Copyright 2016, EMC, Inc.

'use strict';

var di = require('di');

module.exports = wsmanDownloadJobFactory;
di.annotate(wsmanDownloadJobFactory, new di.Provide('Job.Dell.Wsman.Download'));
di.annotate(wsmanDownloadJobFactory, new di.Inject(
    'Job.Dell.Wsman.Base',
    'JobUtils.WsmanTool',
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
    'Services.Configuration'
));

function wsmanDownloadJobFactory(
        BaseJob,
        WsmanTool,
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
        configuration
)
{
    var logger = Logger.initialize(wsmanDownloadJobFactory);
    /**
     *
     * @param {Object} options
     * @param {Object} context
     * @param {String} taskId
     * @constructor
     */
    function WsmanDownloadJob(options, context, taskId) {
        WsmanDownloadJob.super_.call(this, logger, options, context, taskId);
        this.action = options.action;
        this.dellConfigs = undefined;
        this.apiServerConfig=undefined;

        this.fileName=options.fileName;
        this.fileURL=options.fileURL;
        this.targetLocation=options.targetLocation;

    }

    util.inherits(WsmanDownloadJob, BaseJob);

    /*
     *  Initialize basic configuration for the job
     *
     */
    WsmanDownloadJob.prototype._initJob = function () {
        var self = this;

        self.dellConfigs = configuration.get('dell');

        if (!self.dellConfigs || !self.dellConfigs.services.firmware) {
            throw new errors.NotFoundError('Dell FirmwareUpdate web service is not defined in smiConfig.json.'); //jshint ignore:line
        }

        self.apiServerConfig =self.dellConfigs.services.firmware;
    };

    /*
     *  Download the catalog file for firmware updates
     */
    WsmanDownloadJob.prototype._handleSyncRequest = function(){
        logger.info('downloading firmware catalog file');
        var self=this;

        var tmpPath='?fileName='+self.fileName+'&fileUrl='+self.fileURL+'&targetLocation='+self.targetLocation; //jshint ignore:line

        var apiHost=self.dellConfigs.gateway;
        var path=self.apiServerConfig.downloader;
        path=path+tmpPath;
        var method='GET';
        return self.clientRequest(apiHost,path,method,null);
    };

    /*
     * Client Request API
     *
     */
    WsmanDownloadJob.prototype.clientRequest = function(host, path, method, data) {
        var wsman = new WsmanTool(host, {
            verifySSL: false,
            recvTimeoutMs: 60000
        });

        return wsman.clientRequest(path, method, data, 'IP is NOT valid or  httpStatusCode > 206.')
        .then(function(response) {
            return response.body;
        });
    };

    return WsmanDownloadJob;
}
