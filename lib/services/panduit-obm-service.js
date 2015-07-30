// Copyright 2014-2015, Renasar Technologies Inc.
/* jshint node: true */

'use strict';

var di = require('di'),
    util = require('util');

module.exports = panduitObmServiceFactory;

di.annotate(panduitObmServiceFactory, new di.Provide('panduit-obm-service'));
di.annotate(panduitObmServiceFactory,
    new di.Inject('Q', 'OBM.base', '_', 'Assert')
);

function panduitObmServiceFactory(Q, BaseObmService, _, assert) {
    function PanduitObmService(config) {
        BaseObmService.call(this, config);
        this.requiredKeys = ['community', 'host', 'cyclePassword', 'mappings'];
        this.mibPowerCommand = 'HAWK-I2-MIB::pduOutOn';
        this.mibStatusCommand = 'HAWK-I2-MIB::pduOutOn';
        this.mibCyclePwdCommand = 'HAWK-I2-MIB::pduOutPwd';
    }

    util.inherits(PanduitObmService, BaseObmService);

    PanduitObmService.prototype.powerControl = function(control) {
        var self = this;
        var controlCmd = {'on': '1', 'off': '2', 'reboot': '3'};
        return Q.all(_.map(self.options.config.mappings, function(mapping){

                //check if all values in mappings array are expected
                assert.object(mapping, 'mapping should be an object');
                assert.number(mapping.pdu, 'pdu should be a number');
                assert.number(mapping.outlet, 'outlet should be a number');
                //pdu number 1,2,3,4,5,6 is numbered as 1,4,7,10,13,16 by Panduit IPI gateway.
                // Performing pdu number conversion
                var pduNum = (mapping.pdu * 3 - 2).toString();
                var outletNum = mapping.outlet.toString();
                var cyclePwd = self.options.config.cyclePassword;

                return self._runInternal([self.mibCyclePwdCommand + '.' + pduNum + '.' + outletNum, 's', cyclePwd])
                    .then(function () {
                        return self._runInternal([self.mibPowerCommand + '.' + pduNum + '.' + outletNum, 'i', controlCmd[control]]);
                    });
            })
        );
    };

    PanduitObmService.prototype.powerOn = function() {
        return this.powerControl('on');
    };

    PanduitObmService.prototype.powerOff = function() {
        //The 'reboot' task is actually taken as a combined task sequence of
        //'powerOn' then 'powerOff'. Please refer to ObmService.prototype.reboot from obm-service.js
        //in another word, the PanduitObmService.prototype.powerOn will nerver be called.
        //This is a place holder.
        return this.powerControl('off');
    };

    PanduitObmService.prototype.reboot = function() {
        return this.powerControl('reboot');
    };

    PanduitObmService.prototype.powerStatus = function() {
        var self = this;

        return Q.all(_.map(self.options.config.mappings, function(mapping){

                //check if all values in mappings array are expected
                assert.object(mapping, 'mapping should be an object');
                assert.number(mapping.pdu, 'pdu should be a number');
                assert.number(mapping.outlet, 'outlet should be a number');
                //pdu number 1,2,3,4,5,6 is numbered as 1,4,7,10,13,16 by Panduit IPI gateway.
                // Performing pdu number conversion
                var pduNum = (mapping.pdu * 3 - 2).toString();
                var outletNum = mapping.outlet.toString();
                var cyclePwd = self.options.config.cyclePassword;

                return self._runInternal([self.mibStatusCommand + '.' + pduNum + '.' + outletNum], 'snmpwalk')
                    .then(function (result) {
                        if (_.contains(result.stdout, 'INTEGER: on') ||
                            _.contains(result.stdout, 'INTEGER: reboot')) {
                            return true;
                        }

                        else if (_.contains(result.stdout, 'INTEGER: off') ||
                            _.contains(result.stdout, 'INTEGER: unknown')) {
                            return false;
                        }
                        else {
                            return false;
                        }
                    })
            })
        ).then(function (resultArray) {
                var returnValue = false;
                //The overall power status will be 'on', if any of the outlets status in the obmSetting is 'on'
                _.forEach(resultArray, function(n){
                    returnValue = returnValue || n;
                });
                return Q.resolve(returnValue);
            });
    };

    PanduitObmService.prototype._runInternal = function (command, file) {
        return this.run({
            command: file || 'snmpset',
            args: [
                '-v2c',
                '-c', this.options.config.community,
                this.options.config.host
            ].concat(command)
        });
    };

    PanduitObmService.create = function(options) {
        return BaseObmService.create(PanduitObmService, options);
    };

    return PanduitObmService;
}
