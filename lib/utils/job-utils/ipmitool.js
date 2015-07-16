// Copyright 2014-2015, Renasar Technologies Inc.
/* jshint node: true */

'use strict';

var fs = require('fs');
var child_process = require('child_process'); // jshint ignore:line

var di = require('di');

module.exports = ipmitoolFactory;
di.annotate(ipmitoolFactory, new di.Provide('JobUtils.Ipmitool'));
di.annotate(ipmitoolFactory, new di.Inject('Q'));
function ipmitoolFactory(Q) {
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

        var deferred = Q.defer();
        fs.exists('/usr/bin/ipmitool', function(exists) {
            if (!exists) {
                deferred.reject("ipmitool isn't hosted on the local machine" +
                                    " at /usr/bin/ipmitool");
                return;
            }
            if (host && user && password && command) {
                //var cmd = child_process.exec('/usr/bin/ipmitool -I
                //   lanplus -U '+user+' -H '+host+' -P '+password+" "+command
                child_process.exec( // jshint ignore:line
                        '/usr/bin/ipmitool -U '+user+
                            ' -H '+host+' -P '+password+" " + command,
                        function(error, stdout, stderr) {
                            if (error) {
                                error.stderr = stderr;
                                deferred.reject(error);
                            } else {
                                deferred.resolve(stdout);
                            }
                });
            } else {
                if (!host && command) {
                    child_process.exec('/usr/bin/ipmitool ' + command, // jshint ignore:line
                        function(error, stdout, stderr) {
                            if (error) {
                                error.stderr = stderr;
                                deferred.reject(error);
                            } else {
                                deferred.resolve(stdout);
                            }
                        });
                } else if (!user) {
                    deferred.reject("user not defined");
                } else if (!password) {
                    deferred.reject("password not defined");
                } else {
                    deferred.reject("command not defined");
                }
            }
        });
        return deferred.promise;
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
    Ipmitool.prototype.selList = function(host, user, password, count) {
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

    return new Ipmitool();
}
