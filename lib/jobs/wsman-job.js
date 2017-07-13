// Copyright 2016, EMC, Inc.

'use strict';

var di = require('di');

module.exports = wsmanJobFactory;
di.annotate(wsmanJobFactory, new di.Provide('Job.Wsman'));
di.annotate(wsmanJobFactory, new di.Inject(
    'Job.Base',
    'Logger',
    'Util',
    'Promise',
    'Services.Waterline',
    'JobUtils.WsmanTool',
    'Services.Configuration',
    'Services.Encryption',
    'Errors'
));

//wsmanTool has to change

function wsmanJobFactory(
    BaseJob,
    Logger,
    util,
    Promise,
    waterline,
    WsmanTool,
    configuration,
    encryption,
    errors
) {
    var logger = Logger.initialize(wsmanJobFactory);

    /**
     *
     * @param {Object} options
     * @param {Object} context
     * @param {String} taskId
     * @constructor
     */
    function WsmanJob(options, context, taskId) {
        WsmanJob.super_.call(this, logger, options, context, taskId);
        this.routingKey = options.serviceId || context.graphId;
        this.nodeId = options.nodeId;
        this.dellConfigs = undefined;
    }

    util.inherits(WsmanJob, BaseJob);


    /*
    *  Initialize basic configuration for the job
    *
    */
    WsmanJob.prototype.initJob = function (data) {
        var self = this;

        self.dellConfigs = configuration.get('dell');

        if (!self.dellConfigs ||
            !self.dellConfigs.services.powerThermalMonitoring) {
            throw new errors.NotFoundError(
                'Dell web service configuration is not defined in smiConfig.json.');
        }

        self.powerThermalConfigs = self.dellConfigs.services.powerThermalMonitoring;
        self.apiServer = self.dellConfigs.gateway;

        return waterline.obms.findByNode(data.node, 'dell-wsman-obm-service', true)
        .then(function (obm) {
            if (!obm) {
                throw new errors.NotFoundError('Failed to find Wsman obm settings');
            }
            self.oobServerAddress = obm.config.host;
            self.userConfig = {
                "user": obm.config.user,
                "password": encryption.decrypt(obm.config.password)
            };
        });
    };


    /**
     * @function _run
     * @description the jobs internal run method
     */

    WsmanJob.prototype._run = function run() {
        var self = this;

        return waterline.workitems.update({name: "Pollers.WSMAN"}, {failureCount: 0})
        .then(function(){
            return self._subscribeWsmanCommand(self.routingKey, function (data) {
                return Promise.resolve(self.initJob(data))
                .then(function () {
                    return Promise.resolve(self.getPowerMonitoring())
                    .then(function (result) {
                        data.result = result.body;
                        return self._publishWsmanCommandResult(
                            self.routingKey, data.config.command, data);
                    })
                    .then(function () {
                        return waterline.workitems.findOne({id: data.workItemId});
                    })
                    .then(function (workitem) {
                        return waterline.workitems.setSucceeded(null, null, workitem);
                    });
                })
                .catch(function (error) {
                    logger.error("error occured " + error);
                });
            });
        });
    };


    /*
    *   Print the result for RestAPI Response
    */

    WsmanJob.prototype.printResult = function (result) {
        logger.debug(JSON.stringify(result, null, 4));
    };


    WsmanJob.prototype.getPowerMonitoring = function () {
        var self = this;

        var apiHost = self.apiServer;
        var path = self.powerThermalConfigs.powerthermal;
        var method = 'POST';

        if (!self.userConfig) {
            throw ("No user configuration data provided ");
        }
        var data = {

            "serverAddress": self.oobServerAddress,
            "userName": self.userConfig.user,
            "password": self.userConfig.password
        };
        var wsman = new WsmanTool(apiHost);
        return wsman.clientRequest(path, method, data);
        
    };

    return WsmanJob;
}
