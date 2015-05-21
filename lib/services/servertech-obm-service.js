// Copyright 2014-2015, Renasar Technologies Inc.
/* jshint node: true */

'use strict';

var di = require('di'),
    util = require('util');

module.exports = serverTechObmServiceFactory;

di.annotate(serverTechObmServiceFactory, new di.Provide('servertech-obm-service'));
di.annotate(serverTechObmServiceFactory,
    new di.Inject('Q', 'OBM.base', '_')
);

function serverTechObmServiceFactory(Q, BaseObmService, _) {
    function ServerTechObmService(config) {
        BaseObmService.call(this, config);
        this.requiredKeys = ['community', 'host', 'port'];
        this.mibPowerCommand = 'Sentry3-MIB::outletControlAction.1.1';
        this.mibStatusCommand = 'Sentry3-MIB::outletControlState.1.1';
    }

    util.inherits(ServerTechObmService, BaseObmService);

    ServerTechObmService.prototype.reboot = function() {
        return this._runInternal(this.mibPowerCommand + '.' + this.options.config.port, 'i', '3');
    };

    ServerTechObmService.prototype.powerOn = function() {
        return this._runInternal(this.mibPowerCommand + '.' + this.options.config.port, 'i', '1');
    };

    ServerTechObmService.prototype.powerOff = function() {
        return this._runInternal(this.mibPowerCommand + '.' + this.options.config.port, 'i', '2');
    };

    ServerTechObmService.prototype.powerStatus = function() {
        return this._runInternal(this.mibStatusCommand + '.' + this.options.config.port, 'snmpwalk')
        .then(function (result) {
            if (_.contains(result.stdout.contains, 'INTEGER: on') ||
                _.contains(result.stdout.contains, 'INTEGER: idleOn')) {
                return Q.resolve(true);
            }

            if (_.contains(result.stdout.contains, 'INTEGER: off') ||
                _.contains(result.stdout.contains, 'INTEGER: idleOff')) {
                return Q.resolve(false);
            }

            return Q.reject(
                new Error('Unable to determine power state (' + result.stdout + ').')
            );
        });
    };

    ServerTechObmService.prototype._runInternal = function (command, file) {
        return this.run({
            command: file || 'snmpset',
            args: [
                '-v2c',
                '-c', this.options.config.community,
                this.options.config.host
            ].concat(command)
        });
    };

    ServerTechObmService.create = function(options) {
        return BaseObmService.create(ServerTechObmService, options);
    };

    return ServerTechObmService;
}
