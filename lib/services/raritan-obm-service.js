// Copyright 2014-2015, Renasar Technologies Inc.
/* jshint node: true */
/* jshint bitwise: false */

'use strict';

var di = require('di'),
    util = require('util');

module.exports = raritanObmServiceFactory;

di.annotate(raritanObmServiceFactory, new di.Provide('raritan-obm-service'));
di.annotate(raritanObmServiceFactory, new di.Inject('Q', 'OBM.base'));

function raritanObmServiceFactory(Q, BaseObmService) {
    function RaritanObmService(config) {
        BaseObmService.call(this, config);
    }

    util.inherits(RaritanObmService, BaseObmService);

    RaritanObmService.prototype.reboot = function() {
        return this._runInternal(["raw", "0x3C", "0x12", "0x" + this.port.toString(16), "0x2"]);
    };

    RaritanObmService.prototype.powerOn = function() {
        return this._runInternal(["raw", "0x3C", "0x12", "0x" + this.port.toString(16), "0x1"]);
    };

    RaritanObmService.prototype.powerOff = function() {
        return this._runInternal(["raw", "0x3C", "0x12", "0x" + this.port.toString(16), "0x0"]);
    };

    RaritanObmService.prototype.powerStatus = function() {
        return this._runInternal(
            ["raw", "0x3C", "0x13", "0x" + this.port.toString(16)]
        ).then(function (result) {
        	// Match out the raw status byte.
        	var match = result.stdout.match(/^\s*(\d+)\s*$/m);

			if (match && match[1]) {
			  var code = parseInt(match[1], 10);

			  return Q.resolve(code & 0x01 ? true : false);
			} else {
				return Q.reject(
	                new Error('Unable to determine power state (' + result.stdout + ').')
	            );
			}
        });
    };

    RaritanObmService.prototype._runInternal = function (command) {
        return this.run({
            command: "ipmitool",
            args: [
                "-U ", this.user,
                "-P ", this.password,
                "-H ", this.host
            ].concat(command)
        });
    };

    RaritanObmService.create = function(options) {
        return BaseObmService.create(RaritanObmService, options);
    };
}
