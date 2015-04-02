// Copyright 2014-2015, Renasar Technologies Inc.
/* jshint node: true */

'use strict';

var di = require('di'),
    util = require('util');

module.exports = apcObmServiceFactory;

di.annotate(apcObmServiceFactory, new di.Provide('apc-obm-service'));
di.annotate(apcObmServiceFactory,
    new di.Inject('Q', 'OBM.base', '_')
);

function apcObmServiceFactory(Q, BaseObmService, _) {
    function ApcObmService(options) {
        BaseObmService.call(this, options);
        this.requiredKeys = ['community', 'host', 'port'];
        this.mibCommand = 'PowerNet-MIB::sPDUOutletCtl';
    }
    util.inherits(ApcObmService, BaseObmService);

    ApcObmService.prototype.reboot = function() {
        return this._runInternal([this.mibCommand + '.' + this.options.config.port, 'i', '3']);
    };

    ApcObmService.prototype.powerOn = function() {
        return this._runInternal([this.mibCommand + '.' + this.options.config.port, 'i', '1']);
    };

    ApcObmService.prototype.powerOff = function() {
        return this._runInternal([this.mibCommand + '.' + this.options.config.port, 'i', '2']);
    };

    ApcObmService.prototype.powerStatus = function() {
        return this._runInternal([this.mibCommand + '.' + this.options.config.port], 'snmpwalk')
        .then(function (result) {
            if (_.contains(result.stdout, 'outletOn')) {
                return Q.resolve(true);
            }

            if (_.contains(result.stdout, 'outletOff')) {
                return Q.resolve(false);
            }

            return Q.reject(
                new Error('Unable to determine power state (' + result.stdout + ').')
            );
        });
    };

    ApcObmService.prototype._runInternal = function (command, file) {
        return this.run({
            command: file || 'snmpset',
            args: [
                '-v2c',
                '-c', this.options.config.community,
                this.options.config.host
            ].concat(command)
        });
    };

    ApcObmService.create = function(options) {
        return BaseObmService.create(ApcObmService, options);
    };

    return ApcObmService;
}
