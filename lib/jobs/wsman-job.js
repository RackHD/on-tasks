// Copyright 2016, EMC, Inc.

'use strict';

var di = require('di'),
    urlParse = require('url-parse');

module.exports = wsmanJobFactory;
di.annotate(wsmanJobFactory, new di.Provide('Job.Wsman'));
di.annotate(wsmanJobFactory, new di.Inject(
    'Job.Base',
    'Logger',
    'Util',
    'Assert',
    'Promise',
    '_',
    'Services.Waterline',
    'JobUtils.WsmanTool',
    'Constants',
    'Services.Configuration',
    'Services.Encryption',
    'HttpTool',
    'Errors'
));

//wsmanTool has to change

function wsmanJobFactory(
    BaseJob,
    Logger,
    util,
    assert,
    Promise,
    _,
    waterline,
    WsmanTool,
    Constants,
    configuration,
    encryption,
    HttpTool,
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
                'Dell web service configuration is not defined in wsmanConfig.json.');
        }

        self.powerThermalConfigs = self.dellConfigs.services.powerThermalMonitoring;
        //self.apiServer=self.powerThermalConfigs.host;
        self.apiServer = self.dellConfigs.gateway;

        return waterline.obms.findByNode(data.node, 'dell-wsman-obm-service', true)
        .then(function (obm) {
            if (!obm) {
                throw new errors.NotFoundError('Failed to find Wsman obm settings');
            }

            self.oobServerAddress = obm.config.host;
            self.userConfig = {
                "user": obm.config.userName,
                "password": encryption.decrypt(obm.config.password)
            };
        });
    }


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
                        data.result = result;
                        return self._publishWsmanCommandResult(
                            self.routingKey, data.config.command, data)
                    })
                })
                .catch(function (error) {
                    logger.error("error occured " + error);
                });
            });
        });
    }


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
        return self.clientRequest(apiHost, path, method, data);
    };


    /*
     * Client Request API
     * 
     * 
     */

    WsmanJob.prototype.clientRequest = function (host, path, method, data) {
        var self = this;
        var parse = urlParse(host);

        var setups = {};

        setups.url = {};
        setups.url.protocol = parse.protocol.replace(':', '').trim();
        setups.url.host = parse.host.split(':')[0];
        setups.url.port = parse.port;
        setups.url.path = path || '/';

        setups.method = method || 'GET';
        setups.credential = {};
        setups.verifySSl = false;
        setups.headers = { 'Content-Type': 'application/json' };
        setups.recvTimeoutMs = 30 * 1000;
        setups.data = data || '';

        self.printResult(setups);

        var http = new HttpTool();
        return http.setupRequest(setups)
        .then(function () {
            return http.runRequest();
        })
        .then(function (response) {
            if (response.httpStatusCode > 206) {
                var errorMsg = _.get(
                    response,
                    'body.error.message', 'IP is NOT valid or  httpStatusCode > 206');
                throw new Error(errorMsg);
            }
            if (response.body.length > 0) {
                response.body = JSON.parse(response.body);
            }
            return response.body;
        });
    };

    return WsmanJob;
}
