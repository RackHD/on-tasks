// Copyright 2014-2015, Renasar Technologies Inc.
/* jshint node: true */

'use strict';

var childProcess = require('child_process'),
    di = require('di');

module.exports = SnmpFactory;

di.annotate(SnmpFactory, new di.Provide('JobUtils.Snmptool'));
di.annotate(SnmpFactory, new di.Inject(
            'Assert',
            'JobUtils.SnmpParser',
            'ChildProcess',
            'Promise',
            '_'
));
function SnmpFactory(assert, parser, ChildProcess, Promise, _) {
    function SnmpTool(host, community) {
        this.host = host;
        this.community = community;
    }

    SnmpTool.prototype.runCommand = function(command, oid) {
        if (!oid) {
            var missing = _.map({ host: this.host,
                                  community: this.community,
                                  oid: oid },
                function(argValue, argName) {
                    if (!argValue) {
                        return argName;
                    }
            });
            var error = new Error("Missing required arguments: " + missing);
            return Promise.reject(error);
        }
        var args = ['-Oq', '-v2c', '-c', this.community, this.host, oid];
        var childProcess = new ChildProcess(command, args);
        return childProcess.run();
    };

    SnmpTool.prototype.walk = function(oid) {
        return this.runCommand('/usr/bin/snmpwalk', oid);
    };

    SnmpTool.prototype.get = function(oid) {
        return this.runCommand('/usr/bin/snmpget', oid);
    };

    SnmpTool.prototype.getnext = function(oid) {
        return this.runCommand('/usr/bin/snmpgetnext', oid);
    };

    SnmpTool.prototype.bulkget = function(oid) {
        return this.runCommand('/usr/bin/snmpbulkget', oid);
    };

    SnmpTool.prototype.bulkwalk = function(oid) {
        return this.runCommand('/usr/bin/snmpbulkwalk', oid);
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
                return _.map(results.stdout.trim().split('\n'), function (result) {
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
