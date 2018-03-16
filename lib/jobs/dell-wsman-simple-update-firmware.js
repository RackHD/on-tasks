// Copyright 2017 Dell Inc. or its subsidiaries.  All Rights Reserved.

'use strict';

var di = require('di');
var DOMParser = require('xmldom').DOMParser;

module.exports = WsmanSimpleFirmwareUpdateJobFactory;
di.annotate(WsmanSimpleFirmwareUpdateJobFactory, new di.Provide('Job.Dell.Wsman.Simple.Update.Firmware'));
di.annotate(WsmanSimpleFirmwareUpdateJobFactory, new di.Inject(
    'Job.Dell.Wsman.Base',
    'JobUtils.WsmanTool',
    'Logger',
    'Util',
    'Assert',
    'Errors',
    'Promise',
    'uuid',
    'Services.Configuration',
    'fs',
    'ChildProcess'
));

function WsmanSimpleFirmwareUpdateJobFactory(
    BaseJob,
    WsmanTool,
    Logger,
    util,
    assert,
    errors,
    Promise,
    uuid,
    configuration,
    fs,
    ChildProcess
) {
    var logger = Logger.initialize(WsmanSimpleFirmwareUpdateJobFactory);

    /*
     * @param {object} options
     * @param {object} context
     * @param {string} taskId
     * @constructor
     */
    function WsmanSimpleFirmwareUpdateJob(options, context, taskId) {
        var self = this;
        WsmanSimpleFirmwareUpdateJob.super_.call(self, logger, options, context, taskId);
        assert.object(self.options);
        self.graphId = self.context.graphId;
        self.imageURI = self.options.imageURI;
        self.componentIds = [];
        self.targetConfig = {};
    }

    util.inherits(WsmanSimpleFirmwareUpdateJob, BaseJob);

    /*
     * Initialize basic configuraion for the job
     */
    WsmanSimpleFirmwareUpdateJob.prototype._initJob = function() {
        var self = this;
        return Promise.try(function(){
            if(!self.imageURI) {
                throw new Error('imageURI is invalid.');
            }
            self.imageFileName = self.imageURI.slice(self.imageURI.lastIndexOf('/') + 1);
            self.path = self.imageURI.slice(0, self.imageURI.lastIndexOf('/') + 1);
            //get dell config from smiConfig.json
            var dellConfig = configuration.get('dell');
            if(!dellConfig || !dellConfig.gateway || !dellConfig.services || !dellConfig.services.firmware) {
                throw new errors.NotFoundError('Dell firmware update SMI service is not defined in smiConfig.json.');
            }
            self.firmwareConfigs = dellConfig.services.firmware;
            self.apiServer = dellConfig.gateway;
            if(!self.firmwareConfigs.updaterDup) {
                throw new errors.NotFoundError('Firmware dup updater is not defined in smiConfig.json.');
            }
            if(!self.firmwareConfigs.updaterStatus) {
                throw new errors.NotFoundError('Firmware updater status api is not defined in smiConfig.json.');
            }
        })
        .then(function() {
            return self.getComponentId();
        })
        .then(function() {
            return self.checkOBM('Firmware Update');
        })
        .then(function(obm) {
            if(!(obm.config && obm.config.host && obm.config.user && obm.config.password)) {
                throw new errors.NotFoundError('Dell obm setting is invalid.');
            } else {
                self.targetConfig.serverAddress = obm.config.host;
                self.targetConfig.username = obm.config.user;
                self.targetConfig.password = obm.config.password;
            }
        })
        .catch(function(err) {
            logger.error('An error occurred while initializing job.', { error: err });
            throw err;
        });
    };

    /*
     * Create tmp folder to store downloaded image file. (/tmp/graphid)
     * Download image file into graphid folder.
     * Unzip package.xml from image file. Get component id(s) for sending firmware update request.
     */
    WsmanSimpleFirmwareUpdateJob.prototype.getComponentId = function() {
        var self = this;
        var graphTempFolder = '/tmp/' + self.graphId;
        var destinationFile = graphTempFolder + '/' + self.imageFileName;
        var packageXmlPath = graphTempFolder + '/package.xml';
        var childProcess;
        return Promise.resolve()
            .then(function() {
                //create graph temp folder
                if(!fs.existsSync('/tmp')){
                    fs.mkdirSync('/tmp');
                }
                if(!fs.existsSync(graphTempFolder)) {
                    fs.mkdirSync(graphTempFolder);
                }
            })
            .then(function() {
                //download image
                logger.debug('Successfully created graph id folder or checked existance.');
                childProcess = new ChildProcess(
                    'wget',
                    [ self.imageURI, '-O', destinationFile ]
                );
                return childProcess.run({ retries: 0, delay: 0 });
            })
            .then(function() {
                //unzip image exe file
                logger.debug('Successfully downloaded image file.');
                childProcess = new ChildProcess(
                    'unzip',
                    [ '-j', destinationFile, 'package.xml', '-d', graphTempFolder ]
                );
                return childProcess.run({ retries: 0, delay: 0 });
            })
            .then(function() {
                logger.debug('Successfully unzip package xml from firmware image.');
                var readFilePromise = Promise.promisify(fs.readFile);
                return readFilePromise(packageXmlPath, 'ucs2');
            })
            .then(function(data) {
                //retrieve componentid from package.xml
                var packageXml = new DOMParser().parseFromString(data, 'application/xml');
                var devices = packageXml.getElementsByTagName('Device');
                if(!devices || devices.length === 0) {
                    throw new Error('Could not found any device tag in package.xml.');
                }
                for(var i = 0; i < devices.length; i++) { //jshint ignore:line
                    self.componentIds.push(devices[i].getAttribute('componentID'));
                }
                logger.info('Retrieved component ids from packge.xml: ' + self.componentIds);
            })
            .catch(function(err) {
                logger.error('An error occurred while getting component id from package.xml.', { error: err });
                self.DeleteDownloadImage();
                throw err;
            });
    };

    /*
     * Assemble request and call client request to update firmware
     */
    WsmanSimpleFirmwareUpdateJob.prototype._handleAsyncRequest = function() {
        var self = this;
        self.jobSucceed = false;
        return self.UpdateFirmware()
            .then(function() {
                if(self.jobSucceed) {
                    self._done();
                } else {
                    self._done(new Error("Failed to update firmware. Server: " + self.targetConfig.serverAddress));
                }
                self.DeleteDownloadImage();
            });
    };

    /*
     * Recursively traverse component ids, update corresponding firmware
     */
    WsmanSimpleFirmwareUpdateJob.prototype.UpdateFirmware = function() {
        var self = this;
        return Promise.try(function() {
            if(self.componentIds.length > 0) {
                var componentId = self.componentIds.shift();
                logger.info('Assemble firmware update request on target: ' +
                    self.targetConfig.serverAddress + ', ComponentID: ' + componentId);
                var request = {
                    serverAddress: self.targetConfig.serverAddress,
                    userName: self.targetConfig.username,
                    password: self.targetConfig.password,
                    fileName: self.imageFileName,
                    path: self.path,
                    componentId: componentId
                };
                logger.debug('Sending dup update request. Host: ' + self.apiServer + ' Dup API: ' +
                    self.firmwareConfigs.updaterDup + ' Request: ' + JSON.stringify(request));
                return self.SendClientRequest(self.apiServer, self.firmwareConfigs.updaterDup, 'POST', request)
                    .then(function(status) {
                        if(!self.jobSucceed && status === 'Completed') {
                            self.jobSucceed = true;
                        }
                        return self.UpdateFirmware();
                    });
            }
        })
        .catch(function(err) {
            self.jobSucceed = false;
            logger.error('An error occurred while updating firmware.', { error: err });
        });
    };

    /*
     * /updater/dupupdater return two job ids, start with: JID_ and RID_
     * Firstly, check JID jod status. If JID job failed, then firmware update job failed.
     * Only check RID job status in the case of JID job succeed.
     * RID job succeed, then firmware update succeed.
     */
    WsmanSimpleFirmwareUpdateJob.prototype.SendClientRequest = function(host, path, method, data) {
        var self = this,
            wsman = new WsmanTool(host, {
                verifySSL: false,
                recvTimeoutMs: 60000
            }),
            timeout = 3600000,
            interval = 30000;
        return wsman.clientRequest(path, method, data, 'IP is invalid or httpStatusCode > 206')
            .then(function(response) {
                logger.debug('Dup updater repsonse body: ' + JSON.stringify(response.body));
                var jidJobStatus = response.body[0].status;
                if(jidJobStatus === 'undefined' || jidJobStatus  === 'Failed' || jidJobStatus === '') {
                    return 'Failed';
                } else if(jidJobStatus === 'Completed') {
                    var ridJobStatus = response.body[1].status;
                    if(ridJobStatus === 'undefined' || ridJobStatus === 'Failed' || ridJobStatus === '') {
                        return 'Failed';
                    } else if(ridJobStatus === 'Completed') {
                        return 'Completed';
                    } else {
                        return self.PollJobStatus(response.body[1].jobId, timeout, interval);
                    }
                } else {
                    return self.PollJobStatus(response.body[0].jobId, timeout, interval)
                        .then(function(jobStatus) {
                            if(jobStatus === 'Completed') {
                                return self.PollJobStatus(response.body[1].jobId, timeout, interval);
                            } else {
                                return jobStatus;
                            }
                        });
                }
            });
    };

    /*
     * Poll job status every 30s
     * Polling timeout in 1h.
     */
    WsmanSimpleFirmwareUpdateJob.prototype.PollJobStatus = function(jobId, timeout, interval) {
        var self = this,
            request = {
                jobs: [ jobId ],
                password: self.targetConfig.password,
                serverAddress: self.targetConfig.serverAddress,
                userName: self.targetConfig.username
            },
            wsmanTool = new WsmanTool(self.apiServer, {
                verifySSL: false,
                recvTimeoutMs: 60000
            }),
            intervalObject,
            timeoutObject;
        return new Promise(function(resolve, reject) { //jshint ignore:line
            timeoutObject = setTimeout(function() {
                resolve('Failed');
            }, timeout);
            intervalObject = setInterval(function() {
                logger.debug('Sending poll job status request. Host: ' + self.apiServer + ' updater status API: ' +
                    self.firmwareConfigs.updaterStatus + ' Request: ' + JSON.stringify(request));
                return wsmanTool.clientRequest(self.firmwareConfigs.updaterStatus, 'POST', request,
                    'IP is invalid or httpStatusCode > 206')
                    .then(function(response) {
                        logger.debug('Polled job status result: ' + JSON.stringify(response.body));
                        var jobStatus = response.body[0].status;
                        if(jobStatus === 'Completed') {
                            resolve('Completed');
                        } else if(jobStatus === 'undefined' || jobStatus === 'Failed' || jobStatus === '') {
                            resolve('Failed');
                        }
                    })
                    .catch(function(err) {
                        logger.error('An error occurred while polling job status.', { error: err });
                        resolve('Failed');
                    });
            }, interval);
        })
        .finally(function() {
            logger.info('Finished polling job status, server: ' +
                self.targetConfig.serverAddress + ' job id: ' + jobId);
            clearInterval(intervalObject);
            clearTimeout(timeoutObject);
        });
    };

    WsmanSimpleFirmwareUpdateJob.prototype.DeleteDownloadImage = function() {
        logger.debug('Deleting downloaded image...');
        var self = this;
        if(fs.existsSync('/tmp/' + self.graphId)) {
            fs.rmdir('/tmp/' + self.graphId, function(err) {
                if(err) {
                    logger.error('An error occurred while removing temp folder.', { error: err });
                }
            });
        }
    };

    return WsmanSimpleFirmwareUpdateJob;
}
