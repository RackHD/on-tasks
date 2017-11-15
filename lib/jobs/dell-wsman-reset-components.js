//Copyright 2017, Dell EMC, Inc.

'use strict';

var di = require('di');

module.exports = wsmanResetComponentsJobFactory;
di.annotate(wsmanResetComponentsJobFactory, new di.Provide('Job.Dell.Wsman.Reset.Components'));
di.annotate(wsmanResetComponentsJobFactory, new di.Inject(
    'Job.Dell.Wsman.Base',
    'JobUtils.WsmanTool',
    'Logger',
    'Util',
    'Errors',
    'Promise',
    '_',
    'Services.Encryption',
    'Services.Configuration'
));

function wsmanResetComponentsJobFactory(
    BaseJob,
    WsmanTool,
    Logger,
    util,
    Errors,
    Promise,
    _,
    encryption,
    configuration
)
{
    var logger = Logger.initialize(wsmanResetComponentsJobFactory);
    /**
     *
     * @param {Object} options
     * @param {Object} context
     * @param {String} taskId
     * @constructor
     */
    function ResetComponents(options, context, taskId) {
        ResetComponents.super_.call(this, logger, options, context, taskId);

        this.nodeId = this.context.target;
        this.components = options.components;
    }
    util.inherits(ResetComponents, BaseJob);

    ResetComponents.prototype._initJob = function () {
        var self = this;

        logger.info("Initializing ResetComponents job.");

        var dellConfigs = configuration.get('dell');
        self.requestPath = _.get(dellConfigs, 'services.configuration.systemErase');
        self.apiServer = _.get(dellConfigs, 'gateway');

        if (!self.requestPath || !self.apiServer) {
             throw new Errors.NotFoundError(
                'Dell SCP web service is not defined in smiConfig.json.'
             );
        }

        return self.checkOBM('ResetComponents')
         .then(function(obm) {
            self.oobServerAddress = obm.config.host;
            self.userConfig = {
                "user" : obm.config.user,
                "password" : encryption.decrypt(obm.config.password)
            };
       });
    };

    ResetComponents.prototype._handleSyncRequest = function() {
        var self = this;

        var apiHost = self.apiServer;
        var path = self.requestPath;
        var method = 'POST';

        var data = {
            "credential": {
                "address": self.oobServerAddress,
                "userName" :self.userConfig.user,
                "password" :self.userConfig.password,
            },
            "componentNames": self.components
        };

        var wsman = new WsmanTool(apiHost, {
            verifySSL: false,
            recvTimeoutMs: 60000
        });

        return wsman.clientRequest(path, method, data, 'IP is NOT valid or  httpStatusCode > 206.');
    };

    return ResetComponents;
}
