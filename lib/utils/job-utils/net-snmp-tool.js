// Copyright 2014-2015, Renasar Technologies Inc.
/* jshint node: true */

'use strict';

var childProcess = require('child_process'),
    di = require('di');

module.exports = SnmpFactory;

di.annotate(SnmpFactory, new di.Provide('JobUtils.Snmptool'));
di.annotate(SnmpFactory, new di.Inject(
            'Q',
            '_',
            'Assert',
            'JobUtils.SnmpParser'
));

function SnmpFactory(Q, _, assert, parser) {
    function createMetricLabel(mibBaseType, oidSubTreeValue) {
        return mibBaseType + '-' + oidSubTreeValue;
    }

    function SnmpTool(host, community) {
        this.host = host;
        this.community = community;
        this.mibNameMap = {};
    }

    SnmpTool.prototype.walk = function(oid) {
        var self = this;

        if (oid) {
            return Q.nfcall(
                childProcess.exec, '/usr/bin/snmpwalk -v2c -c ' +
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
        return this.get('SNMPv2-MIB::sysDescr.0');
    };

    SnmpTool.prototype.collectHostSnmp = function(oids) {
        var self = this;
        assert.arrayOfString(oids, "User specified OIDs");

        return Q.allSettled(_.map(oids, function (mibTableOrEntry) {
            var parsed;

            return self.walk(mibTableOrEntry)
            .then(function (oids) {
                // first we parse all of our oids that we got from the table.
                // if we did a walk for a mib value and not a table, it
                // shouldn't make a difference in the code...
                var allParsed = _.map(oids[0].trim().split('\n'), function (mib) {
                    // no threshold rule for now
                    mib = mib.trim();

                    try {
                        parsed = parser.parseSnmpData(mib);
                    } catch (e) {

                        return e;
                    }
                    return parsed;
                });

                // then we need to update the label names for each sample
                return _.reduce(allParsed, function (obj, p) {
                    var rawLabel = createMetricLabel(p.mibBaseType, p.oidSubTreeValue);
                    p.metricLabel = self.mibNameMap[rawLabel] || rawLabel;
                    obj.value[p.metricLabel] = p.value;
                    return obj;
                },
                { source: mibTableOrEntry,
                     value: {}
                });
            });
        }))
        .then(function (results) {
            _.forEach(results, function (result) {
                if (result.state !== 'fulfilled') {
                    throw new Error(result.reason);
                }
            });
            return _.map(results, function(result) {
                return result.value;
            });
        });
    };
    return SnmpTool;
}
