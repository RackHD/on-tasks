//Copyright 2017, EMC, Inc.

'use strict';
var di = require('di');
module.exports = wsmanOsDeploymnetDeployJobFactory;
di.annotate(wsmanOsDeploymnetDeployJobFactory, new di.Provide('Job.Dell.Wsman.Os.Deploy'));
di.annotate(wsmanOsDeploymnetDeployJobFactory, new di.Inject(
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

function wsmanOsDeploymnetDeployJobFactory(
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
    var logger = Logger.initialize(wsmanOsDeploymnetDeployJobFactory);
    /**
     *
     * @param {Object} options
     * @param {Object} context
     * @param {String} taskId
     * @constructor
     */
    function WsmanOsDeployJob(options, context, taskId) {
        WsmanOsDeployJob.super_.call(this, logger, options, context, taskId);

        this.action = options.action;
        this.serverAddress= options.serverAddress;
        this.userName= options.userName;
        this.password= options.password;
        this.hypervisorType= options.hypervisorType;
        this.hypervisorVersion= options.hypervisorVersion;
        this.isoFileShare=options.isoFileShare;
    }
    util.inherits(WsmanOsDeployJob, BaseJob);

    /*
     *  Initialize basic configuration for the job
     *
     */
    WsmanOsDeployJob.prototype._initJob = function () {
      var self = this;
      self.dellConfigs = configuration.get('dell');
      if (!self.dellConfigs ||
            !self.dellConfigs.services.osdeployment){
             throw new errors.NotFoundError(
            'Dell web service configuration is not defined in smiConfig.json.');
        }
        self.osConfigs=self.dellConfigs.services.osdeployment;
    };

    WsmanOsDeployJob.prototype._handleSyncRequest = function() {
        var self = this;

        var apiHost=self.dellConfigs.gateway;
        var path=self.osConfigs.deploy;
        var method='POST';
        var data= {
            "serverAddress" : this.serverAddress,
            "userName" : this.userName,
            "password" : this.password,
            "hypervisorType" : this.hypervisorType,
            "hypervisorVersion" : this.hypervisorVersion,
            "isoFileShare" :      this.isoFileShare
         };
        return self.clientRequest(apiHost,path,method,data);
    };

     /*
     * Client Request API
     *
     */
    WsmanOsDeployJob.prototype.clientRequest = function(host, path, method, data) {
        var wsman = new WsmanTool(host, {
            verifySSL: false,
            recvTimeoutMs: 60000
        });

        return wsman.clientRequest(path, method, data, 'IP is NOT valid or  httpStatusCode > 206.')
        .then(function(response) {
            return response.body;
        });
    };
    return WsmanOsDeployJob;
}
