// Copyright 2015, EMC, Inc.
/* jshint node: true */

'use strict';

var di = require('di');

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

    SnmpTool.prototype.runCommand = function(command, oid, maxRepetitions) {
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
        // -Oq makes parsing easier by simplifying snmptool output
        var args = ['-Oq', '-v2c', '-c', this.community, this.host].concat(oid.split(' '));
        // for bulkget and bulkwalk
        if (maxRepetitions) {
            args.unshift('-Cr' + maxRepetitions);
        }
        // Direct snmptool to do translation to human-readable MIB strings on output
        var env = {
            "MIBS": "+ALL"
        };
        // When we walk the whole tree it can get quite large
        var maxBuffer = 3000 * 1024;
        var childProcess = new ChildProcess(command, args, env, null, maxBuffer);
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

    SnmpTool.prototype.bulkget = function(oid, maxRepetitions) {
        return this.runCommand('/usr/bin/snmpbulkget', oid, maxRepetitions);
    };

    SnmpTool.prototype.bulkwalk = function(oid, maxRepetitions) {
        return this.runCommand('/usr/bin/snmpbulkwalk', oid, maxRepetitions);
    };

    SnmpTool.prototype.ping = function() {
        return this.get('SNMPv2-MIB::sysDescr.0');
    };

    SnmpTool.prototype.collectHostSnmp = function(oids, options) {
        assert.arrayOfString(oids, "User specified OIDs");
        options = options || {};
        var queryMethod;

        if (_.contains(['walk', 'get', 'getnext', 'bulkget', 'bulkwalk'], options.snmpQueryType)) {
            queryMethod = this[options.snmpQueryType].bind(this);
        } else {
            queryMethod = this.walk.bind(this);
        }

        // If it is specified to use an snmp bulk request, combine the OIDs
        // and query them all at once rather than with separate snmp requests
        // NOTE: snmpbulkwalk and snmpwalk don't support combine oids in one command line
        if (options.snmpQueryType === 'bulkget' || options.snmpQueryType === 'get') {
            oids = [oids.join(' ')];
        }

        // Sometime, multiple snmp commands run concurrently will cause timeout when network
        // is not good, so need to run snmp commands sequentially to avoid this
        if (options.isSequential === true) {
            var totalResult = [];
            return Promise.each(oids, function (oid) {
                return queryMethod(oid, options.maxRepetitions)
                .then(function (results) {
                    var out = { source: oid };
                    var output = parser.parseSnmpData(results.stdout);
                    out.values = _.transform(output, function (values, entry) {
                        values[entry.oid] = entry.value;
                    }, {});
                    totalResult.push(out);
                });
            })
            .then( function () {
                return totalResult;
            });
        } else {
            return Promise.map(oids, function (oid) {
                return queryMethod(oid, options.maxRepetitions)
                .then(function (results) {
                    var out = { source: oid };
                    var output = parser.parseSnmpData(results.stdout);
                    out.values = _.transform(output, function (values, entry) {
                        values[entry.oid] = entry.value;
                    }, {});
                    return out;
                });
            });
        }
    };

    return SnmpTool;
}
