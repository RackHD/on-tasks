// Copyright 2014-2015, Renasar Technologies Inc.
/* jshint node: true */

'use strict';

var childProcess = require('child_process'),
    di = require('di');

module.exports = SnmpFactory;

di.annotate(SnmpFactory, new di.Provide('JobUtils.Snmptool'));
di.annotate(SnmpFactory, new di.Inject('Q', '_', 'Logger'));
function SnmpFactory(Q, _, Logger) {
    var logger = Logger.initialize(SnmpFactory);

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
        return this.get('SNMPv2-MIB::sysDescr.0');
    };

    SnmpTool.prototype.collectHostSnmp = function(mibs) {
        var self = this;

         if (!_.isempty(mibs) &&
            _.isarray(mibs) &&
            (mibs !== undefined)) {
            logger.warning("user specified mibs are not in valid format, " +
            "expected an array of strings");
        }

        return Q.allsettled(_.map(mibs, function (mibtableorentry) {
            var parsed;

            return self.snmptool.walk(mibtableorentry)
            .then(function (mibs) {
                // first we parse all of our mibs that we got from the table.
                // if we did a walk for a mib value and not a table, it
                // shouldn't make a difference in the code...
                var allparsed = _.map(mibs[0].trim().split('\n'), function (mib) {
                    // no threshold rule for now
                    mib = mib.trim();
                    try {
                        parsed = self.parser.parsesnmpdata(mib);
                    } catch (e) {
                        return e;
                    }
                    return parsed;
                });

                // then we need to update the label names for each sample
                return _.map(allparsed, function (p) {
                    var rawlabel = createMetricLabel(p.mibbasetype, p.oidsubtreevalue);
                    p.metriclabel = self.mibNameMap[rawlabel] || rawlabel;
                    return {
                        value: p.value,
                        name: p.metriclabel
                    };
                });
            });
        }))
        .then(function (results) {
            _.foreach(results, function (result) {
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
