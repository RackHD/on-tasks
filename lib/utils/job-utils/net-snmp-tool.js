// Copyright 2014-2015, Renasar Technologies Inc.
/* jshint node: true */

'use strict';

var childProcess = require('child_process'),
    di = require('di');

module.exports = SnmpFactory;

di.annotate(SnmpFactory, new di.Provide('JobUtils.Snmptool'));
di.annotate(SnmpFactory, new di.Inject('Q', '_'));
function SnmpFactory(Q, _) {
    function SnmpTool(host, community) {
        this.host = host;
        this.community = community;
    }

    SnmpTool.prototype.walk = function(oid) {
        var self = this;

        if (oid) {
            return Q.nfcall(
                childProcess.exec, '/usr/bin/snmpwalk -v2c -c ' +
                    self.community + ' ' + self.host + ' ' + oid);
        } else {
            var missing = _.map({ host: self.host,
                                  community: self.community,
                                  oid: oid },
                function(argValue, argName) {
                    if (!argValue) {
                        return argName;
                    }
            });
            var error = new Error("Missing required arguments: " + missing);
            return Q.reject(error);
        }
    };

    SnmpTool.prototype.get = function(oid) {
        var self = this;

        if (oid) {
            return Q.nfcall(
                childProcess.exec, '/usr/bin/snmpget -v2c -c ' +
                    self.community + ' ' + self.host + ' ' + oid);
        } else {
            var missing = _.map({ host: self.host,
                                  community: self.community,
                                  oid: oid },
                function(argValue, argName) {
                    if (!argValue) {
                        return argName;
                    }
            });
            var error = new Error("Missing required arguments: " + missing);
            return Q.reject(error);
        }
    };

    SnmpTool.prototype.getnext = function(oid) {
        var self = this;

        if (oid) {
            return Q.nfcall(
                childProcess.exec, '/usr/bin/snmpgetnext -v2c -c ' +
                    self.community + ' ' + self.host + ' ' + oid);
        } else {
            var missing = _.map({ host: self.host,
                                  community: self.community,
                                  oid: oid },
                function(argValue, argName) {
                    if (!argValue) {
                        return argName;
                    }
            });
            var error = new Error("Missing required arguments: " + missing);
            return Q.reject(error);
        }
    };

    SnmpTool.prototype.ping = function() {
        return this.get('sysDescr.0');
    };

    return SnmpTool;
}
