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
        // Define device names required in test API
        this.deviceMap = {
            bmcUpdate: "BMC_EMC_OEM",
            biosUpdate: "SPIROM",
            sp: "",
            platform: ""
        };
        // Define device names used to get slot required in test API 
        // For devices that are children of spChildren, to avoid recursive http querying, 
        // slot is retrieve slot from spChildren.
        // It is based on the suppose that spChildren and all its children have the same slot id
        // Slot ids of platformDevice, spDevice, spChildren should be retrieved with device names
        // in deviceMap
        this.slotDeviceMap = {
            bmcUpdate: "BMC_Plugin"
        };
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
    * @param {String} imageFilePath: local file path for the image to be uploaded
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
        switch(firmware){
            case 'bmc':
                modeConfig = {"value": mode, "base": "hex", "name": "image_id"};
                break;
            case 'bios':
                modeConfig = {"value": mode, "base": "dec", "name": "mode"};
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
            deviceKey: firmware + 'Update',
            name: 'update_firmware'
        };
        return self.execDeviceTest(testConfig, options, true);
    };

    /**
    * Diag warm reset
    * @param {Boolean} isSync: indicates if warm reset will be executed synchrously.
    * @return {Promise}
    */
    DiagToolFactory.prototype.warmReset = function(isSync){
        var self = this;
        var testConfig = {
            name: 'warm_reset',
            deviceKey: 'sp'
        };
        return self.execDeviceTest(testConfig, {}, isSync);
    };

    /**
    * Diag bmc reset
    * @param {Boolean} isSync: indicates if bmc reset will be executed synchrously.
    * @return {Promise}
    */
    DiagToolFactory.prototype.bmcReset = function(isSync){
        var self = this;
        var testConfig = {
            name: 'reset',
            deviceKey: 'bmcUpdate'
        };
        return self.execDeviceTest(testConfig, {}, isSync);
    };

    /**
    * Get all devices for a node running diag.
    * Diag devices including platform device, SP device (children device of platform device),
    * and SP children devices;
    * Children devices of SP children devices are not included.
    * @return {Array} device list
    *   Example item of returned array, each item should include href, name and slot:
    *     {
    *         "href": "/api/devices/Platform_O/0_A",
    *         "name": "Platform_O",
    *         "slot": "0_A"
    *     }
    */
    DiagToolFactory.prototype.getAllDevices = function(){
        var self = this;
        var platformApi = '/api/devices';
        return self.getDeviceInfo(platformApi)
        .then(function(platforms){
            self.platformDevice = platforms[0];
            self.deviceMap.platform = self.platformDevice.name;
            return self.getDeviceInfo(self.platformDevice.href, 'children');
        })
        .then(function(spDevices){
            self.spDevice = spDevices[0];
            self.deviceMap.sp = self.spDevice.name;
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
    * Get device slot id
    * @param {String} key: device key used to get device name 
    */
    DiagToolFactory.prototype.getSlotByDeviceKey = function(deviceKey){
        var self = this;
        var deviceList = self.spChildren.concat([self.platformDevice], [self.spDevice]);
        var slotDeviceMap = _.defaults(self.slotDeviceMap, self.deviceMap);
        var deviceName = slotDeviceMap[deviceKey];
        return self.getItemByName(deviceName, deviceList).slot;
    };

    /**
    * Diag API to get device children or tests list information
    * @param {String} deviceApi: device API, example: /api/devices/<device_name>/<slot>
    * @param {String} info: device information to get, two valid value for info:
    *   "children" to get children devices of a device,
    *   "tests" to get all supported tests on a device.
    * @return {Array}: an array of tests or devices
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
    * Execute device test
    * @param {Object} testConfig: test config including device key of test device, and test name
    * @param {Boolean} isSync: flag indicates if test should be run synchronously or asynchronously
    * @return {Promise}
    */
    DiagToolFactory.prototype.execDeviceTest = function(testConfig, options, isSync){
        assert.string(testConfig.name, 'Diag test test name should be a string');
        assert.string(testConfig.deviceKey, 'Diag test device key should be a string');
        assert.object(options, 'Diag test options should be on object');
        var self = this;
        var slot = self.getSlotByDeviceKey(testConfig.deviceKey);
        var deviceName = self.deviceMap[testConfig.deviceKey];

        // API examples:
        //  /api/devices/<device_name>/<slot>/tests/<test_name>
        var api = '/api/%s/%s/%s/tests/%s'.format(
            'devices',
            deviceName,
            slot,
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
