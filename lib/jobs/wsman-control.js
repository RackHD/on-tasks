//Copyright 2016, EMC, Inc.

'use strict';

var di = require('di');

module.exports = wsmanToolJobFactory;
di.annotate(wsmanToolJobFactory, new di.Provide('Job.Dell.WsmanTool'));
di.annotate(wsmanToolJobFactory, new di.Inject(
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
    'Services.Configuration',
    'uuid'
));

function wsmanToolJobFactory(
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
    configuration,
    uuid
)
{
    var logger = Logger.initialize(wsmanToolJobFactory);
    /**
     *
     * @param {Object} options
     * @param {Object} context
     * @param {String} taskId
     * @constructor
     */
    function WsmanToolJob(options, context, taskId) {
        WsmanToolJob.super_.call(this, logger, options, context, taskId);

        this.nodeId = this.context.target;
        this.action = options.action;

        this.shareConfig =  {
                user: options.serverUsername,
                password: options.serverPassword,
                filePath: options.serverFilePath
        };

        this.targetConfig ={
                serverAddress :"",
                user :"",
                password :"",
                forceReboot:""
        };

        if (typeof options.forceReboot !== "undefined") {
            this.targetConfig.forceReboot = options.forceReboot;
        }

        this.dellConfigs = undefined;
    }

    util.inherits(WsmanToolJob, BaseJob);

    /*
     *  Initialize basic configuration for the job
     *
     */
    WsmanToolJob.prototype._initJob = function () {
        var self = this;

        self.dellConfigs = configuration.get('dell');

        if (!self.dellConfigs || !self.dellConfigs.services.firmwareUpdate) {
            throw new errors.NotFoundError('Dell FirmwareUpdate web service is not defined in wsmanConfig.json.'); //jshint ignore:line
        }
        self.firmwareConfigs=self.dellConfigs.services.firmwareUpdate;
        self.apiServer=self.firmwareConfigs.host;

        return waterline.obms.findByNode(self.nodeId, 'dell-wsman-obm-service', true)
        .then(function(obm) {
            if (!obm) {
                throw new errors.NotFoundError('Failed to find Wsman obm settings');
            }

            self.targetConfig.serverAddress=obm.config.host;
            self.targetConfig.userName=obm.config.user;
            self.targetConfig.password= encryption.decrypt(obm.config.password);
        });
    };

    /*
     *  function to find the installed microservice version
     *
     */
    WsmanToolJob.prototype.apiVersion= function(){
        logger.info('apiVersioin - trying to find the provided firmware API version');
        var self=this;

        if (!self.firmwareConfigs.endpoints.apiVersion){
            throw new errors.NotFoundError('Dell FirmwareUpdate web service for API version is not defined in wsmanConfig.json.'); //jshint ignore:line
        }

        var apiHost=self.apiServer;
        var path=self.firmwareConfigs.endpoints.apiVersion;
        var method='GET';
        return self.clientRequest(apiHost,path,method,null);
    };

    /*
     * This method call the microservice to apply the firmware on target server
     */
    WsmanToolJob.prototype._handleAsyncRequest = function(){
        logger.info("calling to start firmware on target server "+ this.oobServerAddress);

        var self=this;

        self.validateConfigs(self.firmwareConfigs.endpoints.updater,'updater');
        self.validateConfigs(self.firmwareConfigs.endpoints.callbackUri,'callbackUri');

        var apiHost=self.apiServer;
        var path=self.firmwareConfigs.endpoints.updater;
        var method='POST';
        var callBackUriRef=self.firmwareConfigs.endpoints.callbackUri;
        var callbackIdentifier = uuid.v4();
        callBackUriRef = callBackUriRef.replace(/_IDENTIFIER_/, callbackIdentifier);

        self._subscribeHttpResponseUuid(self.firmwareUpdateCallback, callbackIdentifier);

        var request=  {
                "serverAddress": self.oobServerAddress,
                "shareAddress" : "",
                "shareName": "",
                "catalogFileName" : "Catalog.xml",
                "shareType" : "0",
                "shareUserName" : "*",
                "sharePassword" : "*",
                "applyUpdate" : "1",
                "Reboot" : "YES",
                "callBack" : {
                    "callbackUri": callBackUriRef,
                    "callbackGraph": "Graph.Dell.Wsman.Firmware",
                    "type": "wsman"
                }
        };
        logger.info('Before calling the endpoint :');
        return self.clientRequest(apiHost,path,method,request);
    };

    /*
     * function called after the result have been sent back from firmware update micro servcie
     */

    WsmanToolJob.prototype.firmwareUpdateCallback = function firmwareUpdateCallback(data){
        var self = this;
        logger.info(' Fimware Update callback function invoked for Node: ' + self.nodeId + ' Type: ' + data.type); //jshint ignore:line
        self.printResult(data);

        var isSuccessful=true;
        if (data!==null && data.length>0){
            data.forEach(function (item){
                if ( !(item.status==='undefined' || item.staus===null || item.status==="")){
                    if(item.status==='Failed'){
                        isSuccessful=false;
                    }
                }
            });
        }

        if (isSuccessful){
            self._done();
        }
        else {
            throw new Error('Firmware Update Failed for provided server , see logs for details');
        }
    };

    /*
     *  Validate firmware configuration data provided wsmanConfig.json file
     */
    WsmanToolJob.prototype.validateConfigs = function(data,name){
        if (!data){
            throw new errors.NotFoundError('Dell FirmwareUpdate web service for '+ name +' is not defined in wsmanConfig.json.'); //jshint ignore:line
        }
    };

    /*
     * Client Request API
     *
     */
    WsmanToolJob.prototype.clientRequest = function(host, path, method, data) {
        var wsman = new WsmanTool(host, {
            verifySSL: false,
            recvTimeoutMs: 60000
        });

        return wsman.clientRequest(path, method, data, 'IP is NOT valid or  httpStatusCode > 206.')
        .then(function(response) {
            return response.body;
        });
    };

    return WsmanToolJob;
}
