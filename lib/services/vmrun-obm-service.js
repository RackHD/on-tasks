// Copyright 2014-2015, Renasar Technologies Inc.
/* jshint node: true */

'use strict';

var di = require('di'),
    util = require('util'),
    _ = require('lodash');

var fusionPath = "/Applications/VMware Fusion.app/Contents/Library/vmrun"; // jshint ignore:line

module.exports = vmrunObmServiceFactory;

di.annotate(vmrunObmServiceFactory, new di.Provide('vmrun-obm-service'));
di.annotate(vmrunObmServiceFactory, new di.Inject('Q', 'OBM.base'));

function vmrunObmServiceFactory(Q, BaseObmService) {
    function VmrunObmService(config) {
        BaseObmService.call(this, config);
    }

    util.inherits(VmrunObmService, BaseObmService);

    VmrunObmService.prototype.reboot = function() {
        var self = this;

        return self.validate().then(function () {
            return self.run(
                fusionPath, ['-T', 'fusion', 'reset', self.vmxpath]
            );
        });
    };

    VmrunObmService.prototype.powerOn = function() {
        var self = this;

        return self.validate().then(function () {
            return self.run(
                fusionPath, ['-T', 'fusion', 'start', self.vmxpath], undefined, 255
            );
        });
    };

    VmrunObmService.prototype.powerOff = function() {
        var self = this;

        return self.validate().then(function () {
            return self.run(
                fusionPath, ['-T', 'fusion', 'stop', self.vmxpath], undefined, 255
            );
        });
    };

    VmrunObmService.prototype.powerStatus = function() {
        var self = this;

        return self.validate().then(function () {
            return self.run(
                fusionPath, ['-T', 'fusion', 'vprobeVersion',  self.vmxpath], undefined, 255
            ).then(function (result) {
                    return !_.contains(result.stdout, 'The virtual machine is not powered on');
                });
        });
    };

    VmrunObmService.prototype.validate = function () {
        var self = this;
        var fs = require('fs');

        function verifyFileExists(path) {
            var deferred = Q.defer();
            fs.exists(path, function(result) {
                if (result) {
                    deferred.resolve(true);
                } else {
                    deferred.reject(false);
                }
            });
            return deferred.promise;
        }
        // verify fusion exists on filesystem
        return verifyFileExists(fusionPath)
            .then(function() {
                // verify vmxpath exists
                return verifyFileExists(self.vmxpath);
            });
    };

    return function(config) {
        return BaseObmService.create(
            VmrunObmService,
            ['vmxpath'],
            config
        );
    };
}
