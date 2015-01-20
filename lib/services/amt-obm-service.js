// Copyright 2014-2015, Renasar Technologies Inc.
/* jshint node: true */

'use strict';

var di = require('di'),
    util = require('util');

module.exports = amtObmServiceFactory;

di.annotate(amtObmServiceFactory, new di.Provide('amt-obm-service'));
di.annotate(amtObmServiceFactory,
    new di.Inject('Q', 'OBM.base', '_')
);

function amtObmServiceFactory(Q, BaseObmService, _) {
    function AmtObmService(config) {
        BaseObmService.call(this, config);
    }

    util.inherits(AmtObmService, BaseObmService);

    AmtObmService.prototype.reboot = function() {
        return this._runInternal(['--force', this.host, 'rem_control', 'reset', 'pxe']);
    };

    AmtObmService.prototype.powerOn = function() {
        return this._runInternal(['--force', this.host, 'rem_control', 'powerup', 'pxe']);
    };

    AmtObmService.prototype.powerOff = function() {
        return this._runInternal(['--force', this.host, 'rem_control', 'powerdown']);
    };

    AmtObmService.prototype.powerStatus = function() {
        return this._runInternal(
            ['--force', this.host, 'rem_control', 'info'], 1
        ).then(function (result) {
            // AMT Power On
            if (_.contains(result.stdout, 'S0')) {
                return true;
            }

            // AMT Power Off
            if (_.contains(result.stdout, 'S5 (soft-off)')) {
                return false;
            }

            return Q.reject(
                new Error('Unable to determine power state (' + result.stdout + ').')
            );
        });
    };

    AmtObmService.prototype.setBootPxe = function() {
        return this._runInternal(['--force', this.host, 'rem_control', 'setbootopt', 'pxe']);
    };

    AmtObmService.prototype._runInternal = function (command, code) {
        return this.run('amttool-tng', command, {
            env: {
                AMT_PASSWORD: this.password,
                AMT_TIMEOUT: 3
            }
        }, code);
    };

    return function(config) {
        return BaseObmService.create(
            AmtObmService,
            ['host', 'password'],
            config
        );
    };
}
