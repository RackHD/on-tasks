// Copyright 2014-2015, Renasar Technologies Inc.
/* jshint node: true */

'use strict';

var di = require('di'),
    util = require('util');

module.exports = ipmiObmServiceFactory;

di.annotate(ipmiObmServiceFactory, new di.Provide('ipmi-obm-service'));
di.annotate(ipmiObmServiceFactory, new di.Inject('Q', 'OBM.base'));

function ipmiObmServiceFactory(Q, BaseObmService) {
    function IpmiObmService(config) {
        BaseObmService.call(this, config);
    }

    util.inherits(IpmiObmService, BaseObmService);

    IpmiObmService.prototype.identifyOn = function() {
        return this._runInternal(['chassis', 'identify', 'force']);
    };

    IpmiObmService.prototype.identifyOff = function() {
        return this._runInternal(['chassis', 'identify', '0']);
    };

    IpmiObmService.prototype.reboot = function() {
        return this._runInternal(['chassis', 'power', 'cycle']);
    };

    IpmiObmService.prototype.powerOn = function() {
        return this._runInternal(['chassis', 'power', 'on']);
    };

    IpmiObmService.prototype.powerOff = function() {
        return this._runInternal(['chassis', 'power', 'off']);
    };

    IpmiObmService.prototype.powerStatus = function() {
        return this._runInternal(['chassis', 'power', 'status']).then(function (result) {
            if (result && result.stdout) {
                return Q.resolve(result.stdout.indexOf('Chassis Power is on') >= 0);
            } else {
                return Q.reject(
                    new Error('Unable to determine power state (' + result.stdout + ').')
                );
            }
        });
    };

    IpmiObmService.prototype.setBootPxe = function() {
        return this._runInternal(['chassis', 'bootdev', 'pxe']);
    };

    IpmiObmService.prototype._runInternal = function (command) {
        return this.run(
            'ipmitool',
            [
                '-U', this.user,
                '-P', this.password,
                '-H', this.host
            ].concat(command)
        );
    };

    return function(config) {
        return BaseObmService.create(
            IpmiObmService,
            ['host', 'user', 'password'],
            config
        );
    };
}
