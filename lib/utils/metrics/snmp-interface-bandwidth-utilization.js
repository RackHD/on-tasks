// Copyright 2014-2015, Renasar Technologies Inc.
/* jshint node: true */

'use strict';

var di = require('di');

module.exports = snmpInterfaceBandwidthUtilizationMetricFactory;
di.annotate(snmpInterfaceBandwidthUtilizationMetricFactory,
        new di.Provide('JobUtils.Metrics.Snmp.InterfaceBandwidthUtilizationMetric'));
di.annotate(snmpInterfaceBandwidthUtilizationMetricFactory, new di.Inject(
    'JobUtils.Snmptool',
    'JobUtils.SnmpParser',
    'Assert',
    'Promise',
    '_'
));
function snmpInterfaceBandwidthUtilizationMetricFactory(
    SnmpTool,
    parser,
    assert,
    Promise,
    _
) {
    function SnmpBandwidthMetric() {
        this.oids = [
            'IF-MIB::ifSpeed',
            'IF-MIB::ifInOctets',
            'IF-MIB::ifOutOctets'
        ];
        this.interfaceCache = {};
    }

    SnmpBandwidthMetric.prototype.collectMetricData = function(data) {
        var self = this;
        assert.object(data);
        assert.string(data.node);

        var snmptool = new SnmpTool(data.host, data.community);

        // We do this every time rather than cacheing it because currently this
        // can account for VLANs, which could have been created after cataloging.
        return snmptool.collectHostSnmp(['IF-MIB::ifAlias'])
        .then(function(result) {
            return [
                result[0],
                self.updateInterfaceNames(result[0].values, data, snmptool)
            ];
        })
        .spread(function(result) {
            return [
                self.collectBandwidthData(result, snmptool),
                data.node,
                data.pollInterval
            ];
        })
        .spread(self.calculateBandwidthUtilization.bind(self));
    };

    SnmpBandwidthMetric.prototype.collectBandwidthData = function(result, snmptool) {
        // Set maxRepititions equal to the number of interfaces for snmpbulkget
        return snmptool.collectHostSnmp(this.oids, {
            snmpQueryType: 'bulkget',
            maxRepititions: _.keys(result.values).length
        });
    };

    SnmpBandwidthMetric.prototype.calculateBandwidthUtilization = function(
            result, node, pollInterval) {

        var self = this;
        var values = result[0].values;

        var out = _.transform(self.interfaceCache[node].names, function(acc, name, alias) {
            var time = pollInterval;
            var speed = parseInt(values['IF-MIB::ifSpeed' + '.' + alias]);
            var inOctets = parseInt(values['IF-MIB::ifInOctets' + '.' + alias]);
            var outOctets = parseInt(values['IF-MIB::ifOutOctets' + '.' + alias]);
            // Only return if we've cached an octet count already to calculate a delta against
            var lastInOctets = self.interfaceCache[node].counters.inOctets;
            var lastOutOctets = self.interfaceCache[node].counters.outOctets;
            if (lastInOctets !== undefined && lastOutOctets !== undefined) {
                var input = self.calculateUtilization(time, speed, lastInOctets, inOctets);
                var output = self.calculateUtilization(time, speed, lastOutOctets, outOctets);
                acc[name] = {
                    inputUtilization: input,
                    outputUtilization: output
                };
            }
            // Store latest retrieved value so we can calculate the delta on next poll
            self.interfaceCache[node].counters.inOctets = inOctets;
            self.interfaceCache[node].counters.outOctets = outOctets;
        }, {});

        return _.isEmpty(out) ? null : out;
    };

    SnmpBandwidthMetric.prototype.updateInterfaceNames = function(interfaceOids, data, snmptool) {
        var self = this;
        var cacheIncomplete;

        if (!_.has(self.interfaceCache, data.node)) {
            cacheIncomplete = true;
        } else {
            cacheIncomplete = _.some(interfaceOids, function(oid) {
                var interfaceOid = _.last(oid.split('.'));
                return !_.has(self.interfaceCache[data.node].names, interfaceOid);
            });
        }

        if (!cacheIncomplete) {
            return;
        }

        return snmptool.collectHostSnmp(['IF-MIB::ifName'])
        .then(function(result) {
            _.forEach(result[0].values, function(name, oid) {
                var alias = _.last(oid.split('.'));
                if (!self.interfaceCache[data.node]) {
                    self.interfaceCache[data.node] = {
                        names: {},
                        counters: {}
                    };
                }
                self.interfaceCache[data.node].names[alias] = name;
            });
        });
    };

    // Utilizing the full-duplex bandwidth calculation algorithms from
    // http://www.cisco.com/c/en/us/support/docs/ip/simple-network-management-protocol-snmp/8141-calculate-bandwidth-snmp.html
    SnmpBandwidthMetric.prototype.calculateUtilization = function(
            timeElapsed, speed, lastOctets, octets) {

        return ((octets - lastOctets) * 8 * 100) / (timeElapsed * speed);
    };

    return new SnmpBandwidthMetric();
}
