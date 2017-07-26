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
        assert.isIP(settings.host, 4);
        this.server = "%s://%s:%s".format(
            settings.protocol || 'http',
            settings.host,
            settings.port || '8080'
        );
        this.nodeId = nodeId;
        this.platformDevice = {};
        this.spDevice = {};
        this.spChildren = [];
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
    * @param {integer} delay: time interval for each retry in millisecond
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
    * Diag firmware update api
    * @param {String} firmware: name of firmware to be updated
    * @param {String} imageName: image name
    * @param {String} mode: image mode
    * @param {String} imagePath: image file path in diag system
    * @return {Promise}
    */
    DiagToolFactory.prototype.updateFirmware = function(firmware, imageName, mode, imagePath){
        var self = this;
        var modeConfig;
        var device;
        switch(firmware){
            case 'bmc':
                modeConfig = {"value": mode, "base": "hex", "name": "image_id"};
                device = 'BMC_EMC_OEM';
                break;
            case 'bios':
                modeConfig = {"value": mode, "base": "dec", "name": "mode"};
                device = 'SPIROM';
                break;
            default:
                return Promise.reject(
                    new Error('Firmware %s update is not supported'.format(firmware))
                );
        }

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
                modeConfig
            ]
        };
        var options = {
            method: 'POST',
            body: payload
        };
        var testConfig = {
            device: device,
            name: 'update_firmware',
            type: 'devices'
        };
        return self.getItemByName(self.spChildren, device)
        .then(function(deviceInfo){
            testConfig.slot = deviceInfo.slot;
            return self.execDeviceTest(testConfig, options, true);
        });
    };

    /**
    * Diag warm reset
    * @param {Boolean} isSync: indicates if warm reset will be executed synchrously.
    * @return {Promise}
    */
    DiagToolFactory.prototype.warmReset = function(isSync){
        var self = this;
        var testConfig = {
            slot: self.spDevice.slot,
            name: 'warm_reset',
            device: self.spDevice.name,
            type: 'devices'
        };
        return self.execDeviceTest(testConfig, {}, isSync);
    };

    /**
    * Get all devices for a storage node.
    * Diag devices including platform device, SP device (child device of platform device), 
    * and SP children devices;
    * Children devices of SP children devices are not included.
    * @return {Array}
    *   Example item of returned array:
    *     {
    *         "href": "/api/devices/Platform_O/0_A",
    *         "name": "Platform_O",
    *         "slot": "0_A"
    *     }
    */
    DiagToolFactory.prototype.getAllDevices = function(){
        var self = this;
        var api = '/api/devices';
        return self.getDeviceInfo(api)
        .then(function(platforms){
            self.platformDevice = platforms[0];
            return self.getDeviceInfo(self.platformDevice.href, 'children');
        })
        .then(function(spDevices){
            self.spDevice = spDevices[0];
            return self.getDeviceInfo(self.spDevice.href, 'children');
        })
        .then(function(spChildren){
            self.spChildren = spChildren;
        });
    };

    /**
    * Get test or device item from a list by name
    * @param {String} name: diag test or device name
    * @param {Array} list: device or test list
    * @return {Promise}
    * returned tests info example:
    *   {
    *       "href": "/api/devices/SPIROM/0_A_0/tests/validate_mailbox",
    *       "name": "validate_mailbox"
    *   }
    * returned devices info example:
    *   {
    *       "href": "/api/devices/BMC_Plugin/0_A",
    *       "name": "BMC_Plugin",
    *       "slot": "0_A"
    *   }
    */
    DiagToolFactory.prototype.getItemByName = function(name, list){
        assert.string(name, 'Diag test name should be a string');
        assert.arrayOfObject(list, 'Diag test list should be an array of Object');
        var info = _.find(list, 'name', name);
        if (!info) {
            throw new Error("No name %s found in given list".format(name));
        }
        return info;
    };

    /**
    * Diag API to get device children or tests list information
    * Each device in diag includes tests and children
    * @param {String} deviceApi: device API, example: /api/devices/<name>/<slot>
    * @param {String} info: device information to get, two valid value for info:
    *   "children" to get children devices of a device,
    *   "tests" to get all supported tests on a device.
    * @return {Promise}: an array of tests or devices
    */
    DiagToolFactory.prototype.getDeviceInfo = function(deviceApi, info){
        assert.string(deviceApi, 'Diag device API should be a string');
        assert.isIn(info, [undefined, 'children', 'tests']);
        var self = this;
        var uri = info ? (self.server + deviceApi + '/' + info) : (self.server + deviceApi);
        var options = {
            uri: uri,
            method: 'GET',
            json: true
        };
        return request(options)
        .then(function(body){
            if (info === "tests"){
                return body.tests;
            } else {
                return body.devices;
            }
        });
    };

    /**
    * Execute device api test
    * @param {Object} testConfig: test config including test device, slot and test name
    * @param {Boolean} isSync: flag indicates if test should be run synchronously
    * @return {Promise}
    */
    DiagToolFactory.prototype.execDeviceTest = function(testConfig, options, isSync){
        assert.string(testConfig.slot, 'Diag test slot should be a string');
        assert.string(testConfig.name, 'Diag test test name should be a string');
        assert.string(testConfig.device, 'Diag test device should be a string');
        assert.isIn(testConfig.type, ['devices', 'system']);
        assert.object(options, 'Diag test options should be on object');
        var self = this;
        // API examples:
        //  /api/system/tests/<test>
        //  /api/devices/tests/<test>
        //  /api/devices/<device>/<slot>/tests/<test>
        var api = '/api/%s/%s/%s/tests/%s'.format(
            testConfig.type,
            testConfig.device,
            testConfig.slot,
            testConfig.name
        );
        if (isSync) {
            api = api + '/sync/run';
        } else{
            api = api + '/run';
        }
        options.uri = self.server + api;
        options.json = true;
        options.method = options.method || 'GET';
        return request(options);
    };

    return DiagToolFactory;
}
