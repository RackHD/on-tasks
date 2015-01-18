// Copyright 2014-2015, Renasar Technologies Inc.
/* jshint node: true */

'use strict';

var di = require('di'),
    util = require('util');

module.exports = serverTechObmServiceFactory;

di.annotate(serverTechObmServiceFactory, new di.Provide('servertech-obm-service'));
di.annotate(serverTechObmServiceFactory,
    new di.Inject('Q', 'OBM.base')
);

function serverTechObmServiceFactory(Q, BaseObmService) {
    function ServerTechObmService(config) {
        BaseObmService.call(this, config);

        this.mibPowerCommand = 'Sentry3-MIB::outletControlAction.1.1';
        this.mibStatusCommand = 'Sentry3-MIB::outletControlState.1.1';
    }

    util.inherits(ServerTechObmService, BaseObmService);

    ServerTechObmService.prototype.reboot = function() {
        return this._runInternal(this.mibPowerCommand + '.' + this.port, 'i', '3');
    };

    ServerTechObmService.prototype.powerOn = function() {
        return this._runInternal(this.mibPowerCommand + '.' + this.port, 'i', '1');
    };

    ServerTechObmService.prototype.powerOff = function() {
        return this._runInternal(this.mibPowerCommand + '.' + this.port, 'i', '2');
    };

    ServerTechObmService.prototype.powerStatus = function() {
        return this._runInternal(this.mibStatusCommand + '.' + this.port, 'snmpwalk')
        .then(function (result) {
            if (result.stdout.contains('INTEGER: on') ||
                result.stdout.contains('INTEGER: idleOn')) {
                return Q.resolve(true);
            }

            if (result.stdout.contains('INTEGER: off') ||
                result.stdout.contains('INTEGER: idleOff')) {
                return Q.resolve(false);
            }

            return Q.reject(
                new Error('Unable to determine power state (' + result.stdout + ').')
            );
        });
    };

    ServerTechObmService.prototype._runInternal = function (command, file) {
        return this.run(
            file || 'snmpset',
            [
                '-v2c',
                '-c', this.community,
                this.host
            ].concat(command)
        );
    };

    return function(config) {
        return BaseObmService.create(
            ServerTechObmService,
            ['host', 'community', 'port'],
            config
        );
    };
}
