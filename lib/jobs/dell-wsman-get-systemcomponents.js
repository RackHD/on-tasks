// Copyright 2017, DELL, Inc.

'use strict';

var di = require('di');

module.exports = DellWsmanGetSystemConfigComponentsFactory;
di.annotate(DellWsmanGetSystemConfigComponentsFactory, new di.Provide('Job.Dell.Wsman.Get.SystemConfigurationComponents'));
di.annotate(DellWsmanGetSystemConfigComponentsFactory, new di.Inject(
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

function DellWsmanGetSystemConfigComponentsFactory(
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
    var logger = Logger.initialize(DellWsmanGetSystemConfigComponentsFactory);

    function DellWsmanGetSystemConfigComponentsJob(options, context, taskId) {
        DellWsmanGetSystemConfigComponentsJob.super_.call(this, logger, options, context, taskId);
        assert.object(this.options);
        this.nodeId = this.context.target;
    }

    util.inherits(DellWsmanGetSystemConfigComponentsJob, BaseJob);

    DellWsmanGetSystemConfigComponentsJob.prototype._initJob = function () {
        var self = this;
        self.dell = configuration.get('dell');
        if (!self.dell || !self.dell.services || !self.dell.services.configuration) {
            throw new errors.NotFoundError('Dell SCP GetConfiguration web service is not defined in wsmanConfig.json.');
        }
    };

    DellWsmanGetSystemConfigComponentsJob.prototype._handleSyncRequest = function () {
        var self = this;
        return self.checkOBM('SCP GetConfiguration')
        .then(function(obm){
            return self.getComponents(obm);
        });
    };

    DellWsmanGetSystemConfigComponentsJob.prototype._handleSyncResponse = function(result) {
        if (typeof result !== "undefined" && result !== null) {
            return waterline.catalogs.create({
                node: this.nodeId,
                source: result.source,
                data: result.data
            });
        } else {
            logger.info('No Result from getComponents to create catalog');
        }
    };

    DellWsmanGetSystemConfigComponentsJob.prototype.getComponents = function(obm) {

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
            self.dell.services.configuration.getComponents,
            "POST",
            self.options
        )
        .then(function(response) {
           var json = JSON.parse(response.body);
           logger.info('Status from SCP GetComponents Microservice:  ' + json["status"]);

            if (json["status"]==="OK" && json.hasOwnProperty("serverComponents") && null !== json["serverComponents"]) {
                return {data: response.body, source: 'idrac-wsman-systemconfiguration-components', store: true};
            } else {
                throw new Error('Failed to Get the Requested Components');
            }
        });
    };

    return DellWsmanGetSystemConfigComponentsJob;
}
