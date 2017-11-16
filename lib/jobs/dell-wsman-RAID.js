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
    'validator'
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
    validator
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
    };

    DellWsmanRAIDJob.prototype._handleSyncRequest = function() {
        var self = this;
        return self.checkOBM('SCP RAID operation')
        .then(function(obm){
            return self.doRAIDoperation(obm);
        });
    };

    DellWsmanRAIDJob.prototype._handleSyncResponse = function(response) {
        var json = JSON.parse(response.body);
        logger.info('Status from SCP Microservice for RAID operation:  ' + json["status"]);
        if (json["status"] === "OK") {
            return response;
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
            self.dell.services.configuration.import,
            "POST",
            data
        );
    };

    return DellWsmanRAIDJob;
}
