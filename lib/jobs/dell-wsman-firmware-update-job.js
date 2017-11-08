// Copyright 2017 Dell Inc. or its subsidiaries.  All Rights Reserved.

'use strict';

var di = require('di');

module.exports = wsmanFirmwareUpdateJobFactory;
di.annotate(wsmanFirmwareUpdateJobFactory, new di.Provide('Job.Dell.Wsman.Firmware.Update'));
di.annotate(wsmanFirmwareUpdateJobFactory, new di.Inject(
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

function wsmanFirmwareUpdateJobFactory(
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
    var logger = Logger.initialize(wsmanFirmwareUpdateJobFactory);
    /**
     * @param {Object} options
     * @param {Object} context
     * @param {String} taskId
     * @constructor
     */
    function wsmanFirmwareUpdateJob(options, context, taskId) {
        var self = this; //jshint ignore:line
        wsmanFirmwareUpdateJob.super_.call(self, logger, options, context, taskId); 
        self.nodeId = self.context.target;
        self.shareConfig =  {
            shareUserName: options.shareFolderUserName || "",
            sharePassword: options.shareFolderPassword || "",
            shareName: options.shareFolderName,
            shareAddress: options.shareFolderAddress,
            shareType: 2
        };
        if (options.shareFolderType === "nfs" || options.shareFolderType === "NFS") {
            self.shareConfig.shareType = 0;
        }
        if (options.shareFolderType === "cifs" || options.shareFolderType === "CIFS") {
            self.shareConfig.shareType = 2;
        }
        self.targetConfig = {
            serverAddress :"",
            user :"",
            password :"",
        };
        self.rebootNeeded = options.rebootNeeded || "YES";
        self.dellConfigs = undefined;
    }

    util.inherits(wsmanFirmwareUpdateJob, BaseJob);

    /*
     *  Initialize basic configuration for the job
     */
    wsmanFirmwareUpdateJob.prototype._initJob = function () {
        var self = this;

        self.dellConfigs = configuration.get('dell');
        if (!self.dellConfigs || !self.dellConfigs.gateway || !self.dellConfigs.services.firmware) {
            throw new errors.NotFoundError('Dell firmware update SMI service is not defined in smiConfig.json.');
        }
        self.firmwareConfigs = self.dellConfigs.services.firmware;
        self.apiServer = self.dellConfigs.gateway;
        self.callbackUri = self.dellConfigs.wsmanCallbackUri;
        if (!self.firmwareConfigs.updater) {
            throw new errors.NotFoundError('updater is not defined in smiConfig.json.');
        }
        if (!self.dellConfigs.wsmanCallbackUri) {
            throw new errors.NotFoundError('wsmanCallbackUri is not defined in smiConfig.json.');
        }

        return self.checkOBM("Firmware Update")
            .then(function(obm) {
                if (!obm.config || !obm.config.host || !obm.config.user || !obm.config.password) {
                    throw new errors.NotFoundError('Dell obm setting is invalid.');
                }
                else {
                    self.targetConfig.serverAddress = obm.config.host;
                    self.targetConfig.userName = obm.config.user;
                    self.targetConfig.password = encryption.decrypt(obm.config.password);
                }
            });
    };

    /*
     * This method call the microservice to apply the firmware on target server
     */
    wsmanFirmwareUpdateJob.prototype._handleAsyncRequest = function(){
        logger.info("calling to start firmware on target server" + this.targetConfig.serverAddress);
        var self = this;
        var apiHost = self.apiServer;
        var path = self.firmwareConfigs.updater;
        var method = 'POST';
        var callBackUriRef = self.callbackUri;
        var callbackIdentifier = uuid.v4();
        callBackUriRef = callBackUriRef.replace(/_IDENTIFIER_/, callbackIdentifier);

        self._subscribeHttpResponseUuid(self.firmwareUpdateCallback, callbackIdentifier);

        var request = {
            serverAddress: self.targetConfig.serverAddress,
            userName: self.targetConfig.userName,
            password: self.targetConfig.password,
            shareAddress: self.shareConfig.shareAddress,
            shareName: self.shareConfig.shareName,
            catalogFileName: "Catalog.xml",
            shareUserName: self.shareConfig.shareUserName,
            sharePassword: self.shareConfig.sharePassword,
            applyUpdate: "1",
            mountPoint: "",
            shareType: self.shareConfig.shareType,
            rebootNeeded: self.rebootNeeded,
            callBack: {
                callbackUri: callBackUriRef,
                callbackGraph: "Graph.Dell.Wsman.Update.Firmware",
                type: "wsman"
            }
        };
        logger.info('Before calling the endpoint :');
        return self.clientRequest(apiHost, path, method, request);
    };

    /*
     * function called after the result have been sent back from firmware update micro servcie
     */

    wsmanFirmwareUpdateJob.prototype.firmwareUpdateCallback = function firmwareUpdateCallback(data){
        var self = this;
        logger.info(' Fimware Update callback function invoked for Node: ' + self.nodeId + ' Type: ' + data.type); //jshint ignore:line
        self.printResult(data);
        var isSuccessful = false;
        var failureFound = false;
        /*
         * callback data may have different result as Success, Exception, Failed. Only get
         * all success result could be consider as success
         */
        if (data !== null && data.length > 0) {
            data.forEach(function (item) {
                if ( !(item.status === 'undefined' || item.status === null || item.status === ""|| failureFound === true)){
                    if(item.status === 'Failed') {
                        isSuccessful = false;
                        failureFound = true;
                    }
                    else {
                        isSuccessful = true;
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
     * Client Request API
     *
     */
    wsmanFirmwareUpdateJob.prototype.clientRequest = function(host, path, method, data) {
        var wsman = new WsmanTool(host, {
            verifySSL: false,
            recvTimeoutMs: 60000
        });

        return wsman.clientRequest(path, method, data, 'IP is NOT valid or httpStatusCode > 206.')
        .then(function(response) {
            return response.body;
        });
    };

    return wsmanFirmwareUpdateJob;
}
