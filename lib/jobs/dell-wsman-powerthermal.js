//Copyright 2016, EMC, Inc.

'use strict';

var di = require('di');

module.exports = wsmanPowerThermalToolJobFactory;
di.annotate(wsmanPowerThermalToolJobFactory, new di.Provide('Job.Dell.PowerThermalTool'));
di.annotate(wsmanPowerThermalToolJobFactory, new di.Inject(
    'Job.Dell.Wsman.Base',
    'JobUtils.WsmanTool',
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
    'Services.Configuration'
));

function wsmanPowerThermalToolJobFactory(
        BaseJob,
        WsmanTool,
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
        configuration
)
{
    var logger = Logger.initialize(wsmanPowerThermalToolJobFactory);
    /**
     *
     * @param {Object} options
     * @param {Object} context
     * @param {String} taskId
     * @constructor
     */
    function PowerThermalTool(options, context, taskId) {
        PowerThermalTool.super_.call(this, logger, options, context, taskId);

        this.nodeId = this.context.target;
        this.powerCap = options.powerCap;
        this.enableCapping= ((options.enableCapping && options.enableCapping === true) ? true:false); //jshint ignore:line
        this.dellConfigs = undefined;
    }
    util.inherits(PowerThermalTool, BaseJob);

    /**
     *  Initialize basic configuration for the job
     *
     */
    PowerThermalTool.prototype._initJob = function () {
        var self = this;

        logger.info("initializing power monitoring capping job");

        self.dellConfigs = configuration.get('dell');

        if (!self.dellConfigs ||
            !self.dellConfigs.services.powerThermalMonitoring){
             throw new errors.NotFoundError(
            'Dell web service configuration is not defined in smiConfig.json.');
        }
        self.powerThermalConfigs=self.dellConfigs.services.powerThermalMonitoring;
        self.apiServer=self.dellConfigs.gateway;

        return self.checkOBM('PowerThermal')
         .then(function(obm) {
            self.oobServerAddress=obm.config.host;
            self.userConfig={
                "user" : obm.config.user,
                "password" : encryption.decrypt(obm.config.password)
            };
       });
    };

    PowerThermalTool.prototype._handleSyncRequest = function() {
        var self = this;

        var apiHost=self.apiServer;
        var path=self.powerThermalConfigs.powerthermal;
        var method='PUT';

        if (!self.userConfig){
            throw ("No user configuration data provided ");
        }
        var data= {

                "serverAddress": self.oobServerAddress,
                "userName" :self.userConfig.user,
                "password" :self.userConfig.password,
                "powerCap": self.powerCap,
                "enableCapping" :self.enableCapping
        };

        return self.clientRequest(apiHost,path,method,data);
    };

    /**
     * Client Request API
     *
     *
     */
    PowerThermalTool.prototype.clientRequest = function(host, path, method, data) {
        var wsman = new WsmanTool(host, {
            verifySSL: false,
            recvTimeoutMs: 60000
        });

        return wsman.clientRequest(path, method, data, 'IP is NOT valid or  httpStatusCode > 206.')
        .then(function(response) {
            return response.body;
        });
    };

    return PowerThermalTool;
}
