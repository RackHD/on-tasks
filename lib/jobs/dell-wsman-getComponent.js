// Copyright © 2017 Dell Inc. or its subsidiaries. All Rights Reserved.

'use strict';

var di = require('di');
module.exports = WsmanGetComponentFactory;
di.annotate(WsmanGetComponentFactory, new di.Provide('Job.Dell.Wsman.getComponent'));
di.annotate(WsmanGetComponentFactory, new di.Inject(
    'Job.Dell.Wsman.Base',
    'JobUtils.WsmanTool',
    'Logger',
    'Assert',
    'Util',
    'Services.Configuration',
    'Errors',
    'Services.Encryption',
    'validator'
));

function WsmanGetComponentFactory(
    BaseJob,
    WsmanTool,
    Logger,
    assert,
    util,
    configuration,
    errors,
    encryption,
    validator
) {
    var logger = Logger.initialize(WsmanGetComponentFactory);

    function WsmanGetComponentJob(options, context, taskId) {
        WsmanGetComponentJob.super_.call(this, logger, options, context, taskId);
        assert.object(this.options);
        this.nodeId = this.context.target;
    }

    util.inherits(WsmanGetComponentJob, BaseJob);

    WsmanGetComponentJob.prototype._initJob = function () {
        var self = this;
        self.dell = configuration.get('dell');
        if (!self.dell || !self.dell.services || !self.dell.services.configuration) {
            throw new errors.NotFoundError('Dell SCP  web service is not defined in smiConfig.json.');
        }
    };

    WsmanGetComponentJob.prototype._handleSyncRequest = function() {
        var self = this;
        return self.checkOBM('SCP create xml for deleting volume')
        .then(function(obm){
            return self.getComponent(obm);
        });
    };

    WsmanGetComponentJob.prototype._handleSyncResponse = function(response) {
        var json = JSON.parse(response.body);
        logger.info('Status from SCP Microservice for getComponent:  ' + json["status"]);
        if (json["status"] === "OK") {
            return response;
        } else {
            throw new Error("Failed to getComponent from smi service");
        }
    };

    WsmanGetComponentJob.prototype.getComponent = function(obm) {
        if (!validator.isIP(obm.config.host)) {
            throw new Error('Invalid ServerIP');
        }
        var self = this;
        var componentNames = "";
        if(self.options.volumeId !== undefined){
            componentNames = self.options.volumeId.split(':')[1];
        }else if(self.options.drives !== undefined){
            var drive = self.options.drives.split(',')[0];
            componentNames = drive.slice(drive.lastIndexOf(':')+1, drive.length);
        }else{
            throw new Error('drives or volumeId isn\'t defined');
        }
        var data = {
            "componentNames": [componentNames],
            "fileName": self.context.graphName + ".xml",
            "serverIP": obm.config.host,
            "serverPassword": obm.config.user,
            "serverUsername": encryption.decrypt(obm.config.password),
            "shareAddress": self.dell.services.shareFolder.address,
            "shareName": self.dell.services.shareFolder.shareName,
            "sharePassword": self.dell.services.shareFolder.password,
            "shareType": self.dell.services.shareFolder.shareType,
            "shutdownType": self.options.shutdownType,
            "shareUsername": self.dell.services.shareFolder.username
        };

        var wsman = new WsmanTool(self.dell.gateway, {
            verifySSl: false,
            recvTimeoutMs: 60000
        });
        return wsman.clientRequest(
            self.dell.services.configuration.getComponents,
            "POST",
            data
        );
    };

    return WsmanGetComponentJob;
}
