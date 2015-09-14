// Copyright 2014-2015, Renasar Technologies Inc.
/* jshint node: true */

'use strict';

var di = require('di');

var FUSION_PATH = "/Applications/VMware Fusion.app/Contents/Library/vmrun"; // jshint ignore:line

module.exports = vmrunObmServiceFactory;

di.annotate(vmrunObmServiceFactory, new di.Provide('vmrun-obm-service'));
di.annotate(vmrunObmServiceFactory, new di.Inject('Promise', 'OBM.base', 'Util', '_', 'fs'));

function vmrunObmServiceFactory(Promise, BaseObmService, util, _, fs) {
    function VmrunObmService(options) {
        BaseObmService.call(this, options);
        this.requiredKeys = ['vmxpath'];
        this.fusionPath = FUSION_PATH;
    }
    util.inherits(VmrunObmService, BaseObmService);

    VmrunObmService.prototype.reboot = function() {
        var self = this;

        return self.validate()
        .then(function () {
            return self._runInternal('reset', self.options.retries, self.options.delay);
        });
    };

    VmrunObmService.prototype.powerOn = function() {
        var self = this;

        return self.validate()
        .then(function () {
            return self._runInternal('start', self.options.retries, self.options.delay || 255);
        });
    };

    VmrunObmService.prototype.powerOff = function() {
        var self = this;

        return self.validate()
        .then(function () {
            return self._runInternal('stop', self.options.retries, self.options.delay || 255);
        });
    };

    VmrunObmService.prototype.powerStatus = function() {
        var self = this;

        return self.validate()
        .then(function () {
            return self._runInternal(
                'vprobeVersion',
                self.options.retries,
                self.options.delay || 255
            );
        })
        .then(function (result) {
            return !_.contains(result.stdout, 'The virtual machine is not powered on');
        });
    };

    VmrunObmService.prototype._runInternal = function(subcommand, retries, delay) {
        return this.run({
            command: this.fusionPath,
            args: ['-T', 'fusion', subcommand, this.options.config.vmxpath],
            retries: retries,
            delay: delay
        });
    };

    VmrunObmService.prototype.validate = function () {
        var self = this;

        function verifyFileExists(path) {
            return new Promise(function (resolve, reject) {
                fs.exists(path, function(result) {
                    if (result) {
                        resolve(true);
                    } else {
                        reject(false);
                    }
                });
            });
        }
        // verify fusion exists on filesystem
        return verifyFileExists(self.fusionPath)
            .then(function() {
                // verify vmxpath exists
                return verifyFileExists(self.options.config.vmxpath);
            });
    };

    VmrunObmService.create = function(options) {
        return BaseObmService.create(VmrunObmService, options);
    };

    return VmrunObmService;
}
