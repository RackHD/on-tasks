//Copyright 2016, EMC, Inc.

'use strict';

var di = require('di');

module.exports = wsmanFirmwareCollectJobFactory;
di.annotate(wsmanFirmwareCollectJobFactory, new di.Provide('Job.Dell.Wsman.Firmware.Collect'));
di.annotate(wsmanFirmwareCollectJobFactory, new di.Inject(
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

function wsmanFirmwareCollectJobFactory(
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
    var logger = Logger.initialize(wsmanFirmwareCollectJobFactory);
    /**
     *
     * @param {Object} options
     * @param {Object} context
     * @param {String} taskId
     * @constructor
     */
    function WsmanFirmwareCollectJob(options, context, taskId) {
        WsmanFirmwareCollectJob.super_.call(this, logger, options, context, taskId);
        this.nodeId = this.context.target;
        this.action = options.action;
        this.dellConfigs = undefined;
        this.apiServerConfig=undefined;
        this.targetConfig={
                serverAddress:"",
                userName : "",
                password : ""
        };

        this.catalogPath=options.catalogPath;
        this.type=options.type;
        this.updateableComponents=options.updateableComponents;
    }

    util.inherits(WsmanFirmwareCollectJob, BaseJob);

    /*
     *  Initialize basic configuration for the job
     *
     */
    WsmanFirmwareCollectJob.prototype._initJob = function () {
        var self = this;

        self.dellConfigs = configuration.get('dell');

        if (!self.dellConfigs || !self.dellConfigs.services.firmware) {
            throw new errors.NotFoundError('Dell FirmwareUpdate web service is not defined in smiConfig.json.'); //jshint ignore:line
        }

        self.apiServerConfig =self.dellConfigs.services.firmware;

        return self.checkOBM('Firmware Collect')
        .then(function(obm) {
            self.targetConfig.serverAddress=obm.config.host;
            self.targetConfig.userName=obm.config.user;
            self.targetConfig.password=encryption.decrypt(obm.config.password);
        });
    };

    /*
     *    Collecting firmware applicable updates
     */
    WsmanFirmwareCollectJob.prototype._handleSyncRequest = function(){
        logger.info('Getting list of applicable updates for firmware update ');

        var self=this;
        var apiHost=self.dellConfigs.gateway;
        var path=self.apiServerConfig.comparer;
        var method='POST';

        var data= {
                "serverAddress":self.targetConfig.serverAddress,
                "userName":self.targetConfig.userName,
                "password":self.targetConfig.password,
                "catalogPath":self.catalogPath,
                "type":self.type,
                "updateableComponentInventory":""
        };

        var wsman = new WsmanTool(apiHost);
        return wsman.clientRequest(path,method,data);
    };

     return WsmanFirmwareCollectJob;
}
