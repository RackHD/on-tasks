// Copyright 2016, DELL, Inc.

'use strict';

var di = require('di');

module.exports = DellWsmanConfigJobFactory;
di.annotate(DellWsmanConfigJobFactory, new di.Provide('Job.Dell.Wsman.Config'));
di.annotate(DellWsmanConfigJobFactory, new di.Inject(
    'Job.Dell.Wsman.Base',
    'JobUtils.WsmanTool',
    'Logger',
    'Promise',
    'Util',
    'Services.Configuration',
    '_',
    'Errors',
    'fs',
    'Constants'
));

function DellWsmanConfigJobFactory(
    BaseJob,
    WsmanTool,
    Logger,
    Promise,
    util,
    configuration,
    _,
    errors,
    fs,
    Constants
) {
    var logger = Logger.initialize(DellWsmanConfigJobFactory);

    /**
     * @param {Object} options task options object
     * @param {Object} context graph context object
     * @param {String} taskId running task identifier
     * @constructor
     */
    function DellWsmanConfigJob(options, context, taskId) {
        DellWsmanConfigJob.super_.call(this,
                                   logger,
                                   options,
                                   context,
                                   taskId);

        this.settings = {};
        this.target = {};
        this.dellConfigs = undefined;
        this.configServer = options.configServer;
    }

    util.inherits(DellWsmanConfigJob, BaseJob);

    /**
     * @memberOf DellWsmanConfigJob
     */
    DellWsmanConfigJob.prototype._initJob = function () {
        var self = this;
        self.dellConfigs = configuration.get('dell');
        if (!self.dellConfigs || !self.dellConfigs.configServerPath) {
            throw new errors.NotFoundError('Config server path for Dell web service is not defined in wsmanConfig.json.'); //jshint ignore:line
        }
    };

    DellWsmanConfigJob.prototype._handleSyncRequest = function() {
        var self = this;
        return self.clientRequest(self.configServer, self.dellConfigs.configServerPath, 'GET', '');
    };

    DellWsmanConfigJob.prototype._handleSyncResponse = function(result) {
        return Promise.resolve(result)
        .then(function() {
            if(!result || _.isEmpty(result)){
                throw new Error('Response for wsman microservice configuration is invalid.'); //jshint ignore:line
            }
            configuration.set('dell:credentials', result.credentials);
            configuration.set('dell:gateway', result.gateway);

            result.service.forEach(function(entry){
                var name = 'dell:services:' + entry.name;
                entry.endpoint.forEach(function(ep){
                    var epName = name + ':' + ep.name;
                    configuration.set(epName, ep.url);
                });
            });
            var buffer = {
                "dell": configuration.get('dell')
            };
            return new Promise(function(resolve, reject) {
                fs.writeFile(Constants.Configuration.Files.Dell, JSON.stringify(buffer, null, 4) + '\n', function(err) {
                    if(err) {
                        reject('Could not write wsman microservice configs to file');
                    } else {
                        resolve();
                        logger.info('Wsman microservice config updated');
                    }
                });
            });
        });
    };

    DellWsmanConfigJob.prototype.clientRequest = function(host, path, method, data) {
        var wsman = new WsmanTool(host, {
            verifySSL: false,
            recvTimeoutMs: 5000
        });

        return wsman.clientRequest(path, method, data, 'Invalid response from config server.')
        .then(function(response) {
            return response.body;
        });
    };

    return DellWsmanConfigJob;
}
