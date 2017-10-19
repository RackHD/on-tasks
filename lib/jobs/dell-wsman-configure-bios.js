// Copyright 2017, DELL, Inc.

'use strict';

var di = require('di');

module.exports = DellWsmanConfigureBiosFactory;
di.annotate(DellWsmanConfigureBiosFactory, new di.Provide('Job.Dell.Wsman.ConfigureBios'));
di.annotate(DellWsmanConfigureBiosFactory, new di.Inject(
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

function DellWsmanConfigureBiosFactory(
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
    var logger = Logger.initialize(DellWsmanConfigureBiosFactory);

    function DellWsmanConfigureBiosJob(options, context, taskId) {
        DellWsmanConfigureBiosJob.super_.call(this, logger, options, context, taskId);
        assert.object(this.options);
        this.nodeId = this.context.target;
    }

    util.inherits(DellWsmanConfigureBiosJob, BaseJob);

    DellWsmanConfigureBiosJob.prototype._initJob = function () {
        var self = this;
        self.dell = configuration.get('dell');

        if (!self.dell || !self.dell.services || !self.dell.services.configuration) {
            throw new errors.NotFoundError('Dell SCP  web service is not defined in smiConfig.json.');
        }
    };

    DellWsmanConfigureBiosJob.prototype._handleSyncRequest = function() {
        var self = this;
        return self.checkOBM('SCP ConfigureBios')
        .then(function(obm){
            return self.configureBios(obm);
        });
    };

    DellWsmanConfigureBiosJob.prototype._handleSyncResponse = function(response) {
        var json = JSON.parse(response.body);
        var serverResult = json["configureBiosResult"];

        if (json["status"]==="OK" && null !==serverResult && serverResult.hasOwnProperty("xmlConfig")) {
            if (serverResult["xmlConfig"]["result"] === "SUCCESS") {
                return response;
            } else {
                throw new Error(serverResult["message"]);
            }

        } else {
            throw new Error("Failed to configure Bios");
        }
    };

    DellWsmanConfigureBiosJob.prototype.configureBios = function(obm) {
        if (!validator.isIP(obm.config.host)) {
            throw new Error('Invalid ServerIP');
        }

        var self = this;
        var data = {
            "serverRequest": {
                "serverIP": obm.config.host,
                "serverUsername": obm.config.user,
                "serverPassword": encryption.decrypt(obm.config.password),
            },
            "attributes": this.options.attributes,
            "biosBootSequenceOrder": this.options.biosBootSequenceOrder,
            "hddSequenceOrder": this.options.hddSequenceOrder,
            "enableBootDevices": this.options.enableBootDevices,
            "disableBootDevices": this.options.disableBootDevices,
            "rebootJobType": this.options.rebootJobType,
            "scheduledStartTime": this.options.scheduledStartTime,
            "untilTime": this.options.untilTime
        };

        var wsman = new WsmanTool(self.dell.gateway, {
            verifySSl: false,
            recvTimeoutMs: 60000
        });
        return wsman.clientRequest(
            self.dell.services.configuration.configureBios,
            "POST",
            data
        );
    };

    return DellWsmanConfigureBiosJob;
}
