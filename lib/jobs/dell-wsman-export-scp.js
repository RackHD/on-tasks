// Copyright 2017, DELL, Inc.

'use strict';

var di = require('di');

module.exports = DellWsmanExportSCPJobFactory;
di.annotate(DellWsmanExportSCPJobFactory, new di.Provide('Job.Dell.Wsman.Export.SCP'));
di.annotate(DellWsmanExportSCPJobFactory, new di.Inject(
    'Job.Dell.Wsman.Base',
    'JobUtils.WsmanTool',
    'Logger',
    'Promise',
    'Assert',
    'Errors',
    'Util',
    'Services.Waterline',
    'Services.Configuration',
    '_',
    'Services.Encryption',
    'validator'
));

function DellWsmanExportSCPJobFactory(
    BaseJob,
    WsmanTool,
    Logger,
    Promise,
    assert,
    errors,
    util,
    waterline,
    configuration,
    _,
    encryption,
    validator
) {
    var logger = Logger.initialize(DellWsmanExportSCPJobFactory);

    function DellWsmanExportSCPJob(options, context, taskId) {
        DellWsmanExportSCPJob.super_.call(this, logger, options, context, taskId);
        assert.object(this.options);
        this.nodeId = this.context.target;
    }

    util.inherits(DellWsmanExportSCPJob, BaseJob);

    DellWsmanExportSCPJob.prototype._initJob = function () {
        var self = this;
        self.dell = configuration.get('dell');

        if (!self.dell || !self.dell.services || !self.dell.services.configuration) {
            throw new errors.NotFoundError('Dell SCP Export web service is not defined in wsmanConfig.json.'); //jshint ignore:line
        }
    };

    DellWsmanExportSCPJob.prototype._handleSyncRequest = function() {
        var self = this;
        return self.checkOBM('SCP Export')
        .then(function(obm){
            return self.exportSCP(obm);
        });
    };

    DellWsmanExportSCPJob.prototype._handleSyncResponse = function(response) {
        logger.info('Response from SCP Export Microservice: ' + response.body);
        var json = JSON.parse(response.body);
        logger.info('Status from SCP Microservice for Export System Configuration:  ' + json.status);  //jshint ignore:line

        if (json.status === "OK" && json.hasOwnProperty("xmlConfig") && null !== json.xmlConfig) { //jshint ignore:line
            var serverResult = json.xmlConfig;
            if (serverResult.result === "SUCCESS") {
                return response;
            } else {
                throw new Error(serverResult.message);
            }
        } else {
            throw new Error('Failed to Export SCP');
        }
    };

    DellWsmanExportSCPJob.prototype.exportSCP = function(obm) {
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
            self.dell.services.configuration.export,
            "POST",
            self.options
        );
    };

    return DellWsmanExportSCPJob;
}
