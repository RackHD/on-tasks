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
    * Wrap fs.createReadStream as Promise
    * @param {String} filename: file to be read to stream
    * @return {Promise}
    */
    function _createReadStream(filename){
        return new Promise(function(resolve, reject){
        var stream;
        function _onError(err){
            reject(err);
        }

        function _onReadable(){
            _cleanup();
            resolve(stream);
        }

        function _cleanup(){
            stream.removeListener('readable', _onReadable);
            stream.removeListener('error', _onError);
        }

        stream = fs.createReadStream(filename);
        stream.on('error', _onError);
        stream.on('readable', _onReadable);
      });
    }

    /**
    * Diag upload image file API
    * @param {String} imageFilePath: local file path for image to be uploaded
    * @param {String} uploadApi: diag API used to upload file
    * @return {Promise}
    */
    DiagToolFactory.prototype.uploadImageFile = function(imageFilePath, uploadApi){
        var self = this;
        var api = uploadApi || '/api/upload/folder';

        var options = {
            uri: self.server + api,
            method: 'POST'
        };
        return _createReadStream(imageFilePath)
        .then(function(stream){
            options.formData = {file: stream};
        })
        .then(function(){
            return request(options);
        });
    };

    /**
    * Diag discovery API
    * @return {Promise}
    */
    DiagToolFactory.prototype.runSyncDiscovery = function(){
        var self = this;
        var api = '/api/system/tests/discovery/sync/run';
        var options = {
            uri: self.server + api,
            method: 'GET',
            json: true
        };
        return request(options);
    };

    /**
    * Diag discovery API with retry, waiting for diag booting and http service loading.
    * During diag booting, request command will failed.
    * During http service loading, request command will get statusCode = 500.
    * @param {integer} delay: time interval for each retry
    * @param {integer} retries: retry count
    * @return {Promise}
    */
    DiagToolFactory.prototype.retrySyncDiscovery = function(delay, retries){
        var self = this;
        return self.runSyncDiscovery()
        .catch(function(err){
            if (_.has(err, 'statusCode') && err.statusCode !== 500) {
                throw err;
            } else if (retries > 0) {
                retries = retries - 1;
                return Promise.delay(delay)
                .then(function(){
                    return self.retrySyncDiscovery(delay*2, retries);
                });
            } else {
                throw new Error('Failed to connect to diag on node, timeout');
            }
        });
    };

    /**
    * Diag get node device information API
    * @return {Object} Diag node device information, an example:
    *     {
    *         "href": "/api/devices/Platform_O/0_A",
    *         "name": "Platform_O",
    *         "slot": "0_A"
    *     }
    */
    DiagToolFactory.prototype.getDeviceInfo = function(){
        var self = this;
        var api = '/api/devices';
        var options = {
            uri: self.server + api,
            method: 'GET',
            json: true
        };
        return request(options)
        .then(function(body){
            return body.devices[0];
        });
    };

    /**
    * Diag update SPIROM firmware API
    * @param {String} slot: diag device slot for a node
    * @param {String} imageName: image name
    * @param {String} mode: image mode
    * @param {String} imagePath: image file path in diag system
    * @return {Promise}
    */
    DiagToolFactory.prototype.updateSpiRom = function(slot, imageName, mode, imagePath){
        assert.string(slot, 'slot should be a string');
        assert.string(imageName, 'imageName should be a string');
        assert.isIn(mode, ['0', '1', '2', '3', '4', '5']);
        var self = this;
        var spiRomId = slot + '_0';
        var api = '/api/devices/SPIROM/%s/tests/update_firmware/sync/run'.format(spiRomId);
        var payload = {
            "test_args": [
                {
                    "value": imageName,
                    "base": "string",
                    "name": "image_name"
                },
                {
                    "value": imagePath || '/uploads',
                    "base": "string",
                    "name": "image_path"
                },
                {
                    // mode: 0 - full bios, 1 - bios, 2 - uefi, 3 - serdes, 4 - post, 5 - me
                    "value": mode,
                    "base": "dec",
                    "name": "mode"
                }
            ]
        };
        var options = {
            uri: self.server + api,
            method: 'POST',
            json: true,
            body: payload
        };
        return request(options)
        .then(function(body){
            var resetFlag;
            try {
                // Reset prompt is used as indication of update firmware API executing success.
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

    /**
    * Diag get device SP test list API
    * @param {String} deviceApi: href in node device information got from getDeviceInfo
    * @return {Promise}
    */
    DiagToolFactory.prototype.getSpTestList = function(deviceApi){
        assert.string(deviceApi, 'Diag device API should be a string');
        var self = this;
        //Platform children API example: /api/devices/<platform>/<slot>/children
        var childrenApi = deviceApi + '/children';
        var options = {
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

    /**
    * Get test API from test list by test name
    * @param {String} testName: diag test name
    * @param {Array} testList: test list from getSpTestList API
    * @return {Promise}
    */
    DiagToolFactory.prototype.getTestApiByName = function(testName, testList){
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

    /**
    * Execute SP test with given API
    * @param {String} spTestApi: SP test API
    * @param {String} isSync: flag indicates if test should be run synchronously
    * @return {Promise}
    */
    DiagToolFactory.prototype.executeSpTest = function(spTestApi, isSync){
        assert.string(spTestApi, 'Diag test list should be an array of Object');
        var self = this;
        var api;
        if (_.endsWith(spTestApi, '/run')){
            api = spTestApi;
        } else if (isSync) {
            api = spTestApi + '/sync/run';
        } else{
            api = spTestApi + '/run';
        }
        var options = {
                uri: self.server + api,
                method: 'GET',
                json: true
            };
        return request(options);
    };

    return DiagToolFactory;
}
