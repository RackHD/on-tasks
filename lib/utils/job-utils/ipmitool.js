// Copyright 2015, EMC, Inc.
/* jshint node: true */

'use strict';

var di = require('di');
var fs = require('fs');
var libipmi = require('ffi-ipmi');
var ref = require('ref');

module.exports = ipmitoolFactory;
di.annotate(ipmitoolFactory, new di.Provide('JobUtils.Ipmitool'));
di.annotate(ipmitoolFactory, new di.Inject('Promise'));
function ipmitoolFactory(Promise) {
    function Ipmitool() {}

    /**
     * Process IPMI command requests by calling into libipmi FFI library.
     *
     * @param host
     * @param user
     * @param password
     * @param command
     */
    Ipmitool.prototype.runCommand = function(host, user, password, command) {
        /* default to lanplus */
        var intfName = "lanplus";
        if (!host && command) {
            /* fallback to open */
            intfName = "open";
        }
        var intf = libipmi.intfLoad(intfName);
        if (!intf) {
            return Promise.reject(new Error("error loading " + intfName + " interface"));
        }

        return new Promise(function (resolve, reject) {
            if (host && user && password && command) {
                if (0 > libipmi.intfSessionSetHostname(intf, host)) {
                    reject("error setting up host");
                } else if (0 > libipmi.intfSessionSetUsername(intf, user)) {
                    reject("error setting up username");
                } else if (0 > libipmi.intfSessionSetPassword(intf, password)) {
                    reject("error setting up password");
                } else if (0 > libipmi.intfSessionSetPrvLvl(intf, 0x4)) {
                    reject('error setting privilage level');
                } else if (0 > libipmi.intfSessionSetLookupBit(intf, 0x10)) {
                    reject('error setting lookup bit');
                } else if (0 > libipmi.intfSessionSetCipherSuiteID(intf, 3)) {
                    reject('error setting cipher suite');
                }
            } else {
                if (intfName === "lan" || intfName === "lanplus") {
                    if (!user) {
                        reject("user not defined");
                    } else if (!password) {
                        reject("password not defined");
                    } else {
                        reject("command not defined");
                    }
                }
            }

            /* open the interface and send the command */
            if (0 == libipmi.intfOpen(intf)) {
                var cmdList = command.split(' ');
                var argCount = cmdList.length + 1;
                var argValue = new Buffer(ref.sizeof.pointer * argCount);

                argValue.writePointer(new Buffer("ipmi\0"), 0);
                for (var i = 0; i < argCount-1; i++) {
                    var str = cmdList[i] + '\0';
                    argValue.writePointer(new Buffer(str), ((i+1)*ref.sizeof.pointer));
                }

                /* Create pointer and get a reference to the output buffer */
                var pBuf = ref.alloc(ref.refType(ref.types.char));
                var rLen = ref.alloc('int', 0);
                var status = libipmi.runCommand(intf, argCount, argValue, pBuf, rLen);
                if (!pBuf.isNull() && 0 !== rLen.deref()) {
                     /* handle the command result */
                    var result = ref.readCString(ref.reinterpret(pBuf.deref(), rLen.deref()));
                    if (0 === status) {
                        resolve(result);
                    } else {
                        reject(result + " (status=" + status + ")");
                    }
                    libipmi.freeOutBuf(pBuf.deref());
                } else {
                    reject("unexpected result for ipmi command " + command);
                }
            } else {
                reject("error opening " + intfName + " interface");
            }

        }).finally(function() {
            libipmi.finishInterface(intf);
        })
    };

    /**
     * Returns a promise with the results or errors of invoking power On
     *
     * @param host
     * @param user
     * @param password
     */
    Ipmitool.prototype.powerOn = function(host, user, password) {
        return this.runCommand(host, user, password, "chassis power on");
    };

    /**
     * Returns a promise with the results or errors of invoking power Off
     *
     * @param host
     * @param user
     * @param password
     */
    Ipmitool.prototype.powerOff = function(host, user, password) {
        return this.runCommand(host, user, password, "chassis power off");
    };

    /**
     * Returns a promise with the results or errors of invoking power cycle
     *
     * @param host
     * @param user
     * @param password
     */
    Ipmitool.prototype.powerCycle = function(host, user, password) {
        return this.runCommand(host, user, password, "chassis power cycle");
    };

    /**
     * Returns a promise with the results or errors of invoking power status
     *
     * @param host
     * @param user
     * @param password
     */
    Ipmitool.prototype.powerStatus = function(host, user, password) {
        return this.runCommand(host, user, password,
                                   "chassis power status");
    };

    /**
     * Returns a promise with the results or errors of invoking identify on
     *
     * @param host
     * @param user
     * @param password
     */
    Ipmitool.prototype.identifyOn = function(host, user, password) {
        return this.runCommand(host, user, password, "chassis identify on");
    };

    /**
     * Returns a promise with the results or errors of invoking identify off
     *
     * @param host
     * @param user
     * @param password
     */
    Ipmitool.prototype.identifyOff = function(host, user, password) {
        return this.runCommand(host, user, password, "chassis identify off");
    };

    /**
     * Returns a promise with the results or errors of invoking chassis status raw(0x00 0x01)
     *
     * @param host
     * @param user
     * @param password
     */
    Ipmitool.prototype.chassisStatus = function(host, user, password) {
        return this.runCommand(host, user, password, "raw 0x00 0x01");
    };

    /**
     * Returns a promise with the results or errors of invoking -v sdr -c
     *
     * @param host
     * @param user
     * @param password
     */
    Ipmitool.prototype.sensorDataRepository = function(host, user, password) {
        return this.runCommand(host, user, password, "-v -c sdr");
    };

    /**
     * Returns a promise with the results or errors of invoking sel
     *
     * @param host
     * @param user
     * @param password
     */
    Ipmitool.prototype.selInformation = function(host, user, password) {
        return this.runCommand(host, user, password, "sel");
    };

    /**
     * Returns a promise with the results or errors of invoking sel list -c
     *
     * @param host
     * @param user
     * @param password
     * @param count
     */
    Ipmitool.prototype.sel = function(host, user, password, count) {
        return this.runCommand(host, user, password, "-c sel list last " + count);
    };

    /**
     * Returns a promise with the results or errors of invoking chassis bootdev pxe
     *
     * @param host
     * @param user
     * @param password
     */
    Ipmitool.prototype.setBootPxe = function(host, user, password) {
        return this.runCommand(host, user, password, "chassis bootdev pxe");
    };

    /**
     * Returns a promise with the results or errors of invoking sdr type 0xd
     *
     * @param host
     * @param user
     * @param password
     */
    Ipmitool.prototype.driveHealthStatus = function(host, user, password) {
        return this.runCommand(host, user, password, "-c sdr type 0xd");
    };

    return new Ipmitool();
}
