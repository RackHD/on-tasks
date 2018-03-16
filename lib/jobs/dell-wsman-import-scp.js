// Copyright 2017, DELL, Inc.

'use strict';

var di = require('di');

module.exports = DellWsmanImportSCPJobFactory;
di.annotate(DellWsmanImportSCPJobFactory, new di.Provide('Job.Dell.Wsman.Import.SCP'));
di.annotate(DellWsmanImportSCPJobFactory, new di.Inject(
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

function DellWsmanImportSCPJobFactory(
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
    var logger = Logger.initialize(DellWsmanImportSCPJobFactory);

    function DellWsmanImportSCPJob(options, context, taskId) {
        DellWsmanImportSCPJob.super_.call(this, logger, options, context, taskId);
        assert.object(this.options);
        this.nodeId = this.context.target;
    }

    util.inherits(DellWsmanImportSCPJob, BaseJob);

    DellWsmanImportSCPJob.prototype._initJob = function() {
        var self = this;
        self.dell = configuration.get('dell');

        if (!self.dell || !self.dell.services || !self.dell.services.configuration) {
            throw new errors.NotFoundError('Dell SCP Import web service is not defined in smiConfig.json.');
        }
    };

    DellWsmanImportSCPJob.prototype._handleSyncRequest = function() {
        var self = this;
        return self.checkOBM('SCP Import')
        .then(function(obm){
            return self.importSCP(obm);
        });
    };

    DellWsmanImportSCPJob.prototype._handleSyncResponse = function(response) {
        logger.info('Response from SCP Microservice for Import System Configuration: ' +  response.body);
        var json = JSON.parse(response.body);
        logger.info('Status from SCP Microservice for Import System Configuration:  ' + json["status"]);

        if (json["status"]==="OK" && json.hasOwnProperty("xmlConfig") && null !== json["xmlConfig"]) {
            var serverResult = json["xmlConfig"];
            if (serverResult["result"] === "SUCCESS") {
                return response;
            } else {
                throw new Error(serverResult["message"]);
            }
        } else {
            throw new Error('Failed to Import SCP');
        }
    };

    DellWsmanImportSCPJob.prototype.importSCP = function(obm) {
        if (!validator.isIP(this.options.serverIP) || !validator.isIP(this.options.shareAddress)) {
            throw new Error('Invalid ServerIP/ShareAddress');
        }
        var self = this;
        this.options.serverUsername = obm.config.user;
        this.options.serverPassword = encryption.decrypt(obm.config.password);

        var wsman = new WsmanTool(self.dell.gateway, {
            verifySSl: false,
            recvTimeoutMs: 60000
        });
        return wsman.clientRequest(
            self.dell.services.configuration.import,
            "POST",
            self.options
        );
    };

    return DellWsmanImportSCPJob;
}
