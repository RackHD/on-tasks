// Copyright 2014-2015, Renasar Technologies Inc.
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
        // When we walk the whole tree it can get quite large
        var maxBuffer = 2000 * 1024;
        var childProcess = new ChildProcess(command, args, null, null, maxBuffer);
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
        if (options.snmpQueryType === 'bulkget' || options.snmpQueryType === 'bulkwalk') {
            oids = [oids.join(' ')];
        }

        return Promise.map(oids, function (oid) {
            return queryMethod(oid, options.maxRepetitions)
            .then(function (results) {
                oids;
                var out = { source: oid };
                var output = results.stdout.trim().split('\n');
                out.values = _.transform(output, function (values, result) {
                    var parsed = parser.parseSnmpData(result.trim());
                    values[parsed.oid] = parsed.value;
                }, {});
                return out;
            });
        });
    };

    return SnmpTool;
}
