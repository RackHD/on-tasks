// Copyright © 2017 Dell Inc. or its subsidiaries. All Rights Reserved.

'use strict';

var di = require('di');

module.exports = DellWsmanRAIDFactory;
di.annotate(DellWsmanRAIDFactory, new di.Provide('Job.Dell.Wsman.RAID'));
di.annotate(DellWsmanRAIDFactory, new di.Inject(
    'Job.Dell.Wsman.Base',
    'JobUtils.WsmanTool',
    'Logger',
    'Assert',
    'Util',
    'Services.Configuration',
    'Errors',
    'Services.Encryption',
    'validator',
    'JobUtils.Smb2Client',
    'JobUtils.NfsClient'
));

function DellWsmanRAIDFactory(
    BaseJob,
    WsmanTool,
    Logger,
    assert,
    util,
    configuration,
    errors,
    encryption,
    validator,
    Smb2Client,
    NfsClient
) {
    var logger = Logger.initialize(DellWsmanRAIDFactory);

    function DellWsmanRAIDJob(options, context, taskId) {
        DellWsmanRAIDJob.super_.call(this, logger, options, context, taskId);
        assert.object(this.options);
        this.nodeId = this.context.target;
    }

    util.inherits(DellWsmanRAIDJob, BaseJob);

    DellWsmanRAIDJob.prototype._initJob = function () {
        var self = this;
        self.dell = configuration.get('dell');
        if (!self.dell || !self.dell.services || !self.dell.services.configuration) {
            throw new errors.NotFoundError('Dell SCP  web service is not defined in smiConfig.json.');
        }
        if(!self.dell.shareFolder){
            throw new errors.NotFoundError('The shareFolder is not defined in smiConfig.json');
        }
    };

    DellWsmanRAIDJob.prototype._handleSyncRequest = function() {
        var self = this;
        if(self.options.ipAddress === '' || self.options.username === '' ||
            self.options.password === ''){
                return self.checkOBM('SCP RAID operation')
                    .then(function(obm){
                        return self.doRAIDoperation(obm);
                    });
        }else{
            var obm = {
                "config": {
                    "host": self.options.ipAddress,
                    "user": self.options.username,
                    "password": self.options.password
                }
            };
            return self.doRAIDoperation(obm);
        }
    };

    DellWsmanRAIDJob.prototype._handleSyncResponse = function(response) {
        var self = this;
        var json = JSON.parse(response.body);
        logger.info('Status from SCP Microservice for RAID operation:  ' + json["status"]);
        if (json["status"] === "OK") {
            if(self.options.removeXmlFile){
                if(self.dell.shareFolder.shareType === 0){
                    var nfsClient = new NfsClient(
                        self.dell.shareFolder.address,
                        self.dell.shareFolder.shareName,
                        self.context.mountDir
                    );
                    return nfsClient.deleteFile(self.context.graphId + ".xml").then(function(){
                        return nfsClient.umount();
                    }).then(function(){
                        return response;
                    }).catch(function(error){
                        logger.error("Errors occur "+ error);
                    });
                }else if (self.dell.shareFolder.shareType === 2){
                    var smb2Client = new Smb2Client(
                        self.dell.shareFolder.address,
                        self.dell.shareFolder.shareName,
                        self.dell.shareFolder.username,
                        self.dell.shareFolder.password
                    );
                    return smb2Client.deleteFile(self.context.graphId + ".xml").then(function(){
                        return response;
                    }).catch(function(error){
                        logger.error("Errors occur "+ error);
                    });
                }else{
                    throw new Error('The shareType must be 0 or 2.');
                }
            }else{
                return response;
            }
        } else {
            throw new Error("Failed to do RAID operations");
        }
    };

    DellWsmanRAIDJob.prototype.doRAIDoperation = function(obm) {
        if (!validator.isIP(obm.config.host)) {
            throw new Error('Invalid ServerIP');
        }
        var self = this;
        var data = {
            "fileName": self.context.graphId + ".xml",
            "serverIP": obm.config.host,
            "serverPassword": encryption.decrypt(obm.config.password),
            "serverUsername": obm.config.user,
            "shareAddress": self.dell.shareFolder.address,
            "shareName": self.dell.shareFolder.shareName,
            "sharePassword": self.dell.shareFolder.password,
            "shareType": self.dell.shareFolder.shareType,
            "shutdownType": self.options.shutdownType,
            "shareUsername": self.dell.shareFolder.username
        };
        var wsman = new WsmanTool(self.dell.gateway, {
            verifySSl: false,
            recvTimeoutMs: 60000
        });
        return wsman.clientRequest(
            self.dell.services.configuration.import,
            "POST",
            data
        );
    };

    return DellWsmanRAIDJob;
}
