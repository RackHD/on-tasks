// Copyright 2017, DELL, Inc.

'use strict';

var di = require('di'),
    fs = require('fs');

module.exports = DellWsmanUpdateSystemConfigComponentsFactory;
di.annotate(DellWsmanUpdateSystemConfigComponentsFactory, new di.Provide('Job.Dell.Wsman.Update.SystemConfigurationComponents'));
di.annotate(DellWsmanUpdateSystemConfigComponentsFactory, new di.Inject(
    'Job.Dell.Wsman.Base',
    'JobUtils.WsmanTool',
    'Logger',
    'Promise',
    'Assert',
    'Util',
    'Services.Waterline',
    'Services.Configuration',
    '_',
    'Errors',
    'Services.Encryption',
    'validator'
));

function DellWsmanUpdateSystemConfigComponentsFactory(
    BaseJob,
    WsmanTool,
    Logger,
    Promise,
    assert,
    util,
    waterline,
    configuration,
    _,
    errors,
    encryption,
    validator
) {
    var logger = Logger.initialize(DellWsmanUpdateSystemConfigComponentsFactory);

    function DellWsmanUpdateSystemConfigComponentsJob(options, context, taskId) {
        DellWsmanUpdateSystemConfigComponentsJob.super_.call(this, logger, options, context, taskId);
        assert.object(this.options);
        this.nodeId = this.context.target;
    }

    util.inherits(DellWsmanUpdateSystemConfigComponentsJob, BaseJob);

    DellWsmanUpdateSystemConfigComponentsJob.prototype._initJob = function () {
        var self = this;
        self.dell = configuration.get('dell');

        if (!self.dell || !self.dell.services || !self.dell.services.configuration) {
            throw new errors.NotFoundError('Dell SCP UpdateComponents web service is not defined in smiConfig.json.');
        }

        if(!self.options.shareAddress && !self.dell.shareFolder) {
            throw new errors.NotFoundError('The shareFolder is neither defined in smiConfig.json nor input by user');
        }

        if(!self.options.shareAddress && self.dell.shareFolder) {
            self.options.shareAddress = self.dell.shareFolder.address;
            self.options.shareName = self.dell.shareFolder.shareName;
            self.options.shareUsername = self.dell.shareFolder.username;
            self.options.sharePassword = self.dell.shareFolder.password;
            self.options.shareType = self.dell.shareFolder.shareType;
        }
    };

    DellWsmanUpdateSystemConfigComponentsJob.prototype._handleSyncRequest = function () {
        var self = this;
        return self.checkOBM('SCP UpdateComponents')
        .then(function(obm){
            return self.updateComponents(obm);
        })
        .then(function(ret){
            if(self.options.cleanup === true) {
               fs.unlink(`${self.options.shareName}/${self.options.fileName}`, function() {});
            }
            return ret;
        });
    };

    DellWsmanUpdateSystemConfigComponentsJob.prototype._handleSyncResponse = function (response) {
        logger.info('Response from SCP Microservice for UpdateComponents: ' + response.body);
        var json = response.body;
        logger.info('Status from SCP Microservice for Update System Configuration:  ' + json["status"]);
        if(json["status"] === "OK") {
            return response;
        } else {
            throw new errors.InternalServerError(json["message"]);
        }
    };

    DellWsmanUpdateSystemConfigComponentsJob.prototype.updateComponents = function(obm) {
        var self = this;
        self.options.serverIP = self.options.serverIP || obm.config.host;

        if (!validator.isIP(self.options.serverIP) || !validator.isIP(self.options.shareAddress)) {
            throw new Error('Invalid ServerIP/ShareAddress');
        }
        var data = {
            "serverAndNetworkShareRequest": {
                "fileName": self.options.fileName,
                "serverIP": self.options.serverIP,
                "serverUsername": obm.config.user,
                "serverPassword": encryption.decrypt(obm.config.password),
                "shareAddress": self.options.shareAddress,
                "shareName": self.options.shareName,
                "shareUsername": self.options.shareUsername,
                "sharePassword": self.options.sharePassword,
                "shareType": self.options.shareType,
                "shutdownType": self.options.shutdownType
            },
            "serverComponents": self.options.serverComponents,
            "forceUpdate": self.options.forceUpdate
        };

        var wsman = new WsmanTool(self.dell.gateway, {
            verifySSl: false,
            recvTimeoutMs: 1800000
        });
        return wsman.clientRequest(
            self.dell.services.configuration.updateComponents,
            "POST",
            data
        );
    };

    return DellWsmanUpdateSystemConfigComponentsJob;
}
