//Copyright 2016, EMC, Inc.

'use strict';

var di = require('di');

module.exports = wsmanOsDeploymnetCreateJobFactory;
di.annotate(wsmanOsDeploymnetCreateJobFactory, new di.Provide('Job.Dell.Wsman.Os.Create'));
di.annotate(wsmanOsDeploymnetCreateJobFactory, new di.Inject(
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

function wsmanOsDeploymnetCreateJobFactory(
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
    var logger = Logger.initialize(wsmanOsDeploymnetCreateJobFactory);
    /**
     *
     * @param {Object} options
     * @param {Object} context
     * @param {String} taskId
     * @constructor
     */
    function WsmanOsCreateJob(options, context, taskId) {
        WsmanOsCreateJob.super_.call(this, logger, options, context, taskId);
       
        this.action = options.action;
        this.destinationDir= options.destinationDir;
        this.destinationFileName= options.destinationFileName;
        this.fileName= options.fileName;
        this.kickStartFileName= options.kickStartFileName;
        this.ksLocation= options.ksLocation;
        this.shareAddress= options.shareAddress;
        this.sourceDir= options.sourceDir;
                  
        logger.info('Actual values for fileName ' + this.fileName);
         

    }

    util.inherits(WsmanOsCreateJob, BaseJob);


     /**
     *  Initialize basic configuration for the job
     *
     */
    WsmanOsCreateJob.prototype._initJob = function () {
        var self = this;
        self.dellConfigs = configuration.get('dell');
      if (!self.dellConfigs ||
            !self.dellConfigs.services.osdeployment){
             throw new errors.NotFoundError(
            'Dell web service configuration is not defined in wsmanConfig.json.');
        }
        self.osConfigs=self.dellConfigs.services.osdeployment;
              
       
    };


    WsmanOsCreateJob.prototype._handleSyncRequest = function() {
        var self = this;

        var apiHost=self.osConfigs.host;
        var path=self.osConfigs.endpoints.create.url;
        var method='POST';
            
        var data= {

            "destinationDir" : this.destinationDir,
            "destinationFileName":this.destinationFileName,
            "fileName": this.fileName,
            "kickStartFileName": this.kickStartFileName,
            "ksLocation": this.ksLocation,
            "shareAddress": this.shareAddress,
            "sourceDir": this.sourceDir
        };

        return self.clientRequest(apiHost,path,method,data);
    };



     /*
     * Client Request API
     *
     */
    WsmanOsCreateJob.prototype.clientRequest = function(host, path, method, data) {
        var wsman = new WsmanTool(host, {
            verifySSL: false,
            recvTimeoutMs: 60000
        });

        return wsman.clientRequest(path, method, data, 'IP is NOT valid or  httpStatusCode > 206.')
        .then(function(response) {
            return response.body;
        });
    };

    return WsmanOsCreateJob;
}
