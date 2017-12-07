// Copyright © 2017 Dell Inc. or its subsidiaries. All Rights Reserved.
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
    'Services.Encryption'
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

    DellWsmanGetSystemConfigComponentsJob.prototype._initJob = function() {
        var self = this;
        self.dell = configuration.get('dell');
        if (!self.dell || !self.dell.services || !self.dell.services.configuration || !self.dell.gateway) {
            throw new errors.NotFoundError('Dell SCP GetConfiguration web service is not defined in smiConfig.json');
        }
        /**
         * Will take user option input share folder config priority over internal recorded share folder
         **/
        if(!self.options.shareAddress){
            if (!self.dell.shareFolder) {
                throw new errors.NotFoundError('The shareFolder is neither defined in smiConfig.json nor input by user');
            }else{
                self.options.shareAddress = self.dell.shareFolder.address;
                self.options.shareName = self.dell.shareFolder.shareName;
                self.options.shareUsername = self.dell.shareFolder.username;
                self.options.sharePassword = self.dell.shareFolder.password;
                self.options.shareType = self.dell.shareFolder.shareType;
            }
        }
    };

    DellWsmanGetSystemConfigComponentsJob.prototype._handleSyncRequest = function() {
        var self = this;
        /**
         * Will take user option input iDRAC setting priority over obms records
         **/
        if (!self.options.serverIP || !self.options.serverUsername || ! self.options.serverPassword) {
            return self.checkOBM('SCP GetConfiguration')
            .then(function(obm){
                return self.getComponents(obm);
            });
        }else {
            var serverSetting = {
                config:{
                    host: self.options.serverIP,
                    user: self.options.serverUsername,
                    password: self.options.serverPassword,
                }
            };
            return self.getComponents(serverSetting);
        }
    };

    DellWsmanGetSystemConfigComponentsJob.prototype._handleSyncResponse = function(result) {
        var self = this;
        if (typeof result !== "undefined" && result !== null) {
            return waterline.catalogs.findLatestCatalogOfSource(self.nodeId, result.source)
            .then(function(catalog){
                if (_.isEmpty(catalog)) {
                    logger.debug("handleAsyncResponse: Catalog (" + result.source + ") not found.  Creating...");
                    return waterline.catalogs.create({
                        node: self.nodeId,
                        source: result.source,
                        data: result.data
                    });
                } else {
                    logger.debug("handleAsyncResponse: Catalog (" + result.source + ") found!  Updating...");
                    return waterline.catalogs.updateByIdentifier(catalog.id, {data: result.data});
                }
            });
        } else {
            logger.info('No Result from getComponents to create catalog');
            return Promise.resolve();
        }
    };

    DellWsmanGetSystemConfigComponentsJob.prototype.getComponents = function(obm) {
        var self = this;
        self.options.serverIP = obm.config.host;
        self.options.serverUsername = obm.config.user;
        self.options.serverPassword = obm.config.password;

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
           var jsonResponse = response.body;
           logger.info('Status from SCP GetComponents Microservice:  ' + jsonResponse["status"]);

            if (jsonResponse["status"] === "OK" && jsonResponse.hasOwnProperty("serverComponents") && jsonResponse["serverComponents"] !== null ) {
                return {data: response.body, source: 'idrac-wsman-systemconfiguration-components', store: true};
            } else {
                throw new Error('Failed to Get the Requested Components');
            }
        });
    };

    return DellWsmanGetSystemConfigComponentsJob;
}
