// Copyright 2015, EMC, Inc.
/* jshint node: true */

'use strict';

var fs = require('fs');
var child_process = require('child_process'); // jshint ignore:line

var di = require('di');

module.exports = ipmitoolFactory;
di.annotate(ipmitoolFactory, new di.Provide('JobUtils.Ipmitool'));
di.annotate(ipmitoolFactory, new di.Inject('Promise'));
function ipmitoolFactory(Promise) {
    function Ipmitool() {}

    /*
    Wrapper utility for shelling out and using ipmitool to interact
    with a network attached BMC

    usage: ipmitool [options...] <command>

    -H hostname    Remote host name for LAN interface
    -U username    Remote session username
    -P password    Remote session password
    */
    Ipmitool.prototype.runCommand = function(host, user, password, command) {
        return new Promise(function (resolve, reject) {
            fs.exists('/usr/bin/ipmitool', function(exists) {
                if (!exists) {
                    reject("ipmitool isn't hosted on the local machine" +
                                        " at /usr/bin/ipmitool");
                    return;
                }

                var options = { timeout: 60000 };
                if (host && user && password && command) {
                    //var cmd = child_process.exec('/usr/bin/ipmitool -I
                    //   lanplus -U '+user+' -H '+host+' -P '+password+" "+command
                    child_process.exec( // jshint ignore:line
                            '/usr/bin/ipmitool -U '+user+
                                ' -H '+host+' -P '+password+" " + command,
                            options,
                            function(error, stdout, stderr) {
                                if (error) {
                                    error.stderr = stderr;
                                    reject(error);
                                } else {
                                    resolve(stdout);
                                }
                    });
                } else {
                    if (!host && command) {
                        child_process.exec('/usr/bin/ipmitool ' + command, // jshint ignore:line
                            options,
                            function(error, stdout, stderr) {
                                if (error) {
                                    error.stderr = stderr;
                                    reject(error);
                                } else {
                                    resolve(stdout);
                                }
                            });
                    } else if (!user) {
                        reject("user not defined");
                    } else if (!password) {
                        reject("password not defined");
                    } else {
                        reject("command not defined");
                    }
                }
            });
        });
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
        return this.runCommand(host, user, password, "-v sdr");
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
