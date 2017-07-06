// Copyright 2017, Dell EMC, Inc.

'use strict';

var di = require('di');
var fs = require('fs');
var request = require('request-promise');

module.exports = diagToolFactory;
di.annotate(diagToolFactory, new di.Provide('JobUtils.DiagTool'));
di.annotate(diagToolFactory, new di.Inject('Promise', '_', 'Logger', 'Assert'));

function diagToolFactory(Promise, _, Logger, assert) {

    function DiagToolFactory(settings, nodeId) {
        this.settings = settings || {};
        this.server = "%s://%s:%s".format(
            this.settings.protocol || 'http',
            this.settings.host,
            this.settings.port || '8080'
        );
        this.nodeId = nodeId;
    }

    var logger = Logger.initialize(diagToolFactory);

    /**
    * fs.createReadStream is not sync function and can't be promisified
    */
    function createReadStream(filename){
        return new Promise(function(resolve, reject){
        var stream;
        function onError(err){
            reject(err);
        }

        function onReadable(){
            cleanup();
            resolve(stream);
        }

        function cleanup(){
            stream.removeListener('readable', onReadable);
            stream.removeListener('error', onError);
        }

        stream = fs.createReadStream(filename);
        stream.on('error', onError);
        stream.on('readable', onReadable);
      });
    }

    DiagToolFactory.prototype.uploadImageFile = function(imageFilePath, uploadApi){
        var self = this;
        var api = uploadApi || '/api/upload/folder';

        var options = {
            uri: self.server + api,
            method: 'POST'
        };
        return createReadStream(imageFilePath)
        .then(function(stream){
            options.formData = {file: stream};
        })
        .then(function(){
            return request(options);
        });
    };

    DiagToolFactory.prototype.runSyncDiscovery = function(discoveryApi){
        var self = this;
        var api = discoveryApi || '/api/system/tests/discovery/sync/run';
        var options = {
            uri: self.server + api,
            method: 'GET',
            json: true
        };
        return request(options);
    };

    DiagToolFactory.prototype.retrySyncDiscovery = function(delay, retries, discoveryApi){
        var self = this;
        return self.runSyncDiscovery(discoveryApi)
        .catch(function(err){
            if (_.has(err, 'statusCode') && err.statusCode !== 500) {
                logger.error('Faied to run diag discovery', {
                    error: err,
                    nodeId: self.nodeId,
                    api: discoveryApi
                });
                throw err;
            } else if (retries > 0) {
                retries = retries - 1;
                return Promise.delay(delay)
                .then(function(){
                    return self.retrySyncDiscovery(delay*2, retries, discoveryApi);
                });
            } else {
                logger.error('Faied to run diag discovery', {
                    error: 'Timeout',
                    nodeId: self.nodeId,
                    api: discoveryApi
                });
                throw new Error('Failed to connect to diag on node, timeout');
            }
        });
    };

    DiagToolFactory.prototype.getDevices = function(deviceApi){
        var self = this;
        var api = deviceApi || '/api/devices';
        var options = {
            uri: self.server + api,
            method: 'GET',
            json: true
        };
        return request(options)
        .then(function(body){
            return body.devices;
        });
    };

    DiagToolFactory.prototype.getSlotId = function(devices){
        assert.arrayOfObject(devices, 'Diag devices list should be an array of Object');
        return devices[0].slot;
    };

    DiagToolFactory.prototype.getDeviceApi = function(devices){
        assert.arrayOfObject(devices, 'Diag devices list should be an array of Object');
        return devices[0].href;
    };

    DiagToolFactory.prototype.updateSpiRom = function(slot, imageName, mode, imagePath, updateSpiRomApi){
        var self = this;
        var spiRomId = slot + '_0'; //TODO: verify the relations here
        var api = updateSpiRomApi ||
            '/api/devices/SPIROM/%s/tests/update_firmware/sync/run'.format(spiRomId);
        var payload = {
            "test_args": [
                {
                  "value": imageName, //TODO: confirm how to get file name
                  "base": "string",
                  "name": "image_name"
                },
                {
                  "value": imagePath || '/uploads', //TODO: confirm if upload is the default path
                  "base": "string",
                  "name": "image_path"
                },
                {
                  "value": mode || "1", //0 - full bios, 1 - bios, 2 - uefi, 3 - serdes, 4 - post, 5 - me
                  "base": "dec", // mode is decimal digital
                  "name": "mode"
                }
            ]
        };
        var options = {
            uri: self.server + api,
            method: 'POST',
            json: true,
            //headers: {"content-type": "application/json"},
            body: payload
        };
        return request(options)
        .then(function(body){
            var resetFlag;
            try{
                resetFlag = body.result[body.result.length-2].atomic_test_data.secure_firmware_update;
                if(!_.isEqual(resetFlag, 'Issue warm reset NOW!')){
                    throw new Error('Reset flag is not expected');
                }
            } catch(err) {
                logger.error('Failed to get reset flags from diag', {
                    error: err,
                    body: body,
                    nodeId: self.nodeId,
                    api:api
                });
               throw new Error('Failed to get reset flags from diag');
            }
            return body;
        });
    };

    DiagToolFactory.prototype.getTestList = function(deviceApi){
        assert.string(deviceApi, 'Diag device API should be a string');
        var self = this;
        var childrenApi = deviceApi + '/children';
        var options = {
            //Platform children API: /api/devices/<platform>/<slot>/children
            uri: self.server + childrenApi,
            method: 'GET',
            json: true
        };
        return request(options)
        .then(function(children){
            //Platform SP test API: /api/devices/<platform_sp>/<slot>/tests
            var testApi = children.devices[0].href + '/tests';
            options.uri = self.server + testApi;
            return request(options);
        })
        .then(function(body){
            return body.tests;
        });
    };

    DiagToolFactory.prototype.getTestApi = function(testName, testList){
        assert.string(testName, 'Diag test name should be a string');
        assert.arrayOfObject(testList, 'Diag test list should be an array of Object');
        var api;
        _.forEach(testList, function(test){
            if (test.name === testName){
                api = test.href;
                return false;
            }
        });
        return api;
    };

    DiagToolFactory.prototype.warmReset = function(testList){
        assert.arrayOfObject(testList, 'Diag test list should be an array of Object');
        var self = this;
        var options;
        return Promise.try(function(){
            var resetApi = self.getTestApi('warm_reset', testList);
            if (!resetApi) {
                throw new Error('Can not get warm reset test API');
            }
            var api = resetApi + '/run';
            options = {
                uri: self.server + api,
                method: 'GET',
                json: true
            };
        })
        .then(function(){
            return request(options);
        });
    };

    return DiagToolFactory;
}
