// Copyright 2015, EMC, Inc.

'use strict';

var di = require('di');

module.exports = panduitObmServiceFactory;

di.annotate(panduitObmServiceFactory, new di.Provide('panduit-obm-service'));
di.annotate(panduitObmServiceFactory,
    new di.Inject(
        'Promise',
        'OBM.base',
        '_',
        'Assert',
        'Util'
    )
);

function panduitObmServiceFactory(
    Promise,
    BaseObmService,
    _,
    assert,
    util
) {
    function PanduitObmService(config) {
        BaseObmService.call(this, config);
        //Only pduOutlets is mandatory
        this.requiredKeys = ['pduOutlets'];
        this.mibPowerCommand = 'HAWK-I2-MIB::pduOutOn';
        this.mibStatusCommand = 'HAWK-I2-MIB::pduOutOn';
        this.mibCyclePwdCommand = 'HAWK-I2-MIB::pduOutPwd';
    }

    util.inherits(PanduitObmService, BaseObmService);

    PanduitObmService.prototype.powerControl = function(control) {
        var self = this;
        var controlCmd = {'on': '1', 'off': '2', 'reboot': '3'};

        return Promise.map(self.options.config.pduOutlets, function(pduOutlet){

            //check if all values in pduOutlet array are expected
            assert.string(pduOutlet.host || self.options.config.host,
                          "host should be defined as a string");
            assert.string(pduOutlet.community || self.options.config.community,
                          "community should be defined as a string");
            assert.object(pduOutlet, 'pduOutlet should be an object');
            assert.number(pduOutlet.pdu, 'pdu should be a number');
            assert.number(pduOutlet.outlet, 'outlet should be a number');
            //pdu number 1,2,3,4,5,6 is numbered as 1,4,7,10,13,16 by Panduit IPI gateway.
            // Performing pdu number conversion
            var pduNum = (pduOutlet.pdu * 3 - 2).toString();
            var outletNum = pduOutlet.outlet.toString();
            var host = pduOutlet.host || self.options.config.host;
            var community = pduOutlet.community || self.options.config.community;

            //default cyclePassword will be Axx if not defind.
            var cyclePwd = pduOutlet.cyclePassword ||
                                self.options.config.cyclePassword ||
                                ('A' + 
                                 ((outletNum.length === 1)? '0' + outletNum : outletNum ));

            return self._runInternal([self.mibCyclePwdCommand + 
                                     '.' + pduNum + 
                                     '.' + outletNum,
                                     's', cyclePwd],
                                     host,
                                     community,
                                     'snmpset'
                                    )
                .then(function () {
                    // vPDU doesn't accept control command right after setting password
                    // Retry three times to ensure the controlling succeed
                    return self._runInternal([self.mibPowerCommand + 
                                             '.' + pduNum + 
                                             '.' + outletNum,
                                             'i', controlCmd[control]],
                                             host,
                                             community,
                                             'snmpset',
                                             3
                                            );
                });
        });
    };

    PanduitObmService.prototype.powerOn = function() {
        return this.powerControl('on');
    };

    PanduitObmService.prototype.powerOff = function() {
        return this.powerControl('off');
    };

    PanduitObmService.prototype.reboot = function() {
        //The 'reboot' task is actually taken as a combined task sequence of
        //'powerOn' then 'powerOff'. Please refer to ObmService.prototype.reboot
        //from obm-service.js.
        //in another word, the PanduitObmService.prototype.powerOn will nerver be called.
        //This is a place holder.
        return this.powerControl('reboot');
    };

    PanduitObmService.prototype.powerStatus = function() {
        var self = this;

        return Promise.map(self.options.config.pduOutlets, function(pduOutlet){

            //check if all values in pduOutlet array are expected
            assert.string(pduOutlet.host || self.options.config.host,
                          "host should be defined as a string");
            assert.string(pduOutlet.community || self.options.config.community,
                          "community should be defined as a string");
            assert.object(pduOutlet, 'pduOutlet should be an object');
            assert.number(pduOutlet.pdu, 'pdu should be a number');
            assert.number(pduOutlet.outlet, 'outlet should be a number');
            //pdu number 1,2,3,4,5,6 is numbered as 1,4,7,10,13,16 by Panduit IPI gateway.
            // Performing pdu number conversion
            var pduNum = (pduOutlet.pdu * 3 - 2).toString();
            var outletNum = pduOutlet.outlet.toString();
            var host = pduOutlet.host || self.options.config.host || 'localhost';
            var community = pduOutlet.community || self.options.config.community || 'public';

            return self._runInternal([self.mibStatusCommand + '.' + pduNum + '.' + outletNum],
                                     host,
                                     community,
                                     'snmpwalk')
                .then(function (result) {
                    if (_.contains(result.stdout, 'INTEGER: on') ||
                        _.contains(result.stdout, 'INTEGER: reboot')) {
                        return true;
                    }else if (_.contains(result.stdout, 'INTEGER: off') ||
                        _.contains(result.stdout, 'INTEGER: unknown')) {
                        return false;
                    }else {
                        return false;
                    }
                });
        }).then(function (resultArray) {
            var returnValue = false;
            //The overall power status will be 'on',
            //if any of the outlets status in the obmSetting is 'on'
            _.forEach(resultArray, function(n){
                returnValue = returnValue || n;
            });
            return returnValue;
        });
    };

    PanduitObmService.prototype._runInternal = function (command, host, community, file, retries) {
        return this.run({
            command: file,
            args: [
                '-v2c',
                '-c', community,
                host
            ].concat(command),
            retries: retries
        });
    };

    PanduitObmService.create = function(options) {
        return BaseObmService.create(PanduitObmService, options);
    };

    return PanduitObmService;
}
