// Copyright 2014-2015, Renasar Technologies Inc.
/* jshint node: true */

'use strict';

var childProcess = require('child_process'),
    di = require('di');

module.exports = SnmpFactory;

di.annotate(SnmpFactory, new di.Provide('JobUtils.Snmptool'));
di.annotate(SnmpFactory, new di.Inject(
            'Q',
            'Promise',
            '_',
            'Assert',
            'JobUtils.SnmpParser'
));

function SnmpFactory(Q, Promise, _, assert, parser) {
    function SnmpTool(host, community) {
        this.host = host;
        this.community = community;
        this.mibNameMap = {};
    }

    SnmpTool.prototype.walk = function(oid) {
        var self = this;

        if (oid) {
            return Q.nfcall(
                childProcess.exec, '/usr/bin/snmpwalk -Oq -v2c -c ' +
                    self.community + ' ' + self.host + ' ' + oid,
                    {maxBuffer: 2 * 1024 * 1024});
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
                childProcess.exec, '/usr/bin/snmpget -Oq -v2c -c ' +
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
                childProcess.exec, '/usr/bin/snmpgetnext -Oq -v2c -c ' +
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
        return this.get('SNMPv2-MIB::sysDescr.0');
    };

    SnmpTool.prototype.collectHostSnmp = function(oids) {
        var self = this;
        assert.arrayOfString(oids, "User specified OIDs");

        return Promise.map(oids, function (oid) {
            return self.walk(oid)
            .then(function (results) {
                return _.map(results[0].trim().split('\n'), function (result) {
                    var parsed = parser.parseSnmpData(result.trim());
                    var out = {
                        source: oid,
                        value: {}
                    };
                    out.value[parsed.oid] = parsed.value;
                    return out;
                });
            });
        });
    };

    return SnmpTool;
}
