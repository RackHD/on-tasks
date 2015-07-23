// Copyright 2014-2015, Renasar Technologies Inc.
/* jshint node: true */

'use strict';

var di = require('di');

module.exports = snmpInterfaceBandwidthUtilizationMetricFactory;
di.annotate(snmpInterfaceBandwidthUtilizationMetricFactory,
        new di.Provide('JobUtils.Metrics.Snmp.InterfaceBandwidthUtilizationMetric'));
di.annotate(snmpInterfaceBandwidthUtilizationMetricFactory, new di.Inject(
    'JobUtils.Metrics.Snmp.Base',
    'Promise',
    'Util',
    '_'
));
function snmpInterfaceBandwidthUtilizationMetricFactory(
    BaseMetric,
    Promise,
    util,
    _
) {
    function SnmpBandwidthMetric(nodeId, host, community, pollInterval) {
        this.oids = [
            'IF-MIB::ifSpeed',
            'IF-MIB::ifInOctets',
            'IF-MIB::ifOutOctets'
        ];
        this.pollInterval = pollInterval;
        this.counterCache = {
            inOctets: null,
            outOctets: null
        };
        SnmpBandwidthMetric.super_.call(this, nodeId, host, community);
    }
    util.inherits(SnmpBandwidthMetric, BaseMetric);

    SnmpBandwidthMetric.prototype.collectMetricData = function() {
        var self = this;

        return self.updateOidDescriptionMapByType('names')
        .then(self.collectBandwidthData.bind(self))
        .then(self.calculateBandwidthUtilization.bind(self));
    };

    SnmpBandwidthMetric.prototype.collectBandwidthData = function(numInterfaces) {
        // Set maxRepititions equal to the number of interfaces for snmpbulkget
        return this.snmptool.collectHostSnmp(this.oids, {
            snmpQueryType: 'bulkget',
            maxRepititions: numInterfaces
        })
        .then(function(result) {
            return result[0].values;
        });
    };

    SnmpBandwidthMetric.prototype.calculateBandwidthUtilization = function(values) {
        var self = this;

        var out = _.transform(self.oidDescriptionMap[self.nodeId].names,
                function(acc, name, alias) {
            var time = self.pollInterval;
            var speed = parseInt(values['IF-MIB::ifSpeed' + '.' + alias]);
            var inOctets = parseInt(values['IF-MIB::ifInOctets' + '.' + alias]);
            var outOctets = parseInt(values['IF-MIB::ifOutOctets' + '.' + alias]);
            // Only return if we've cached an octet count already to calculate a delta against
            var lastInOctets = self.counterCache.inOctets;
            var lastOutOctets = self.counterCache.outOctets;
            if (lastInOctets !== undefined && lastOutOctets !== undefined) {
                var input = self.calculateUtilization(time, speed, lastInOctets, inOctets);
                var output = self.calculateUtilization(time, speed, lastOutOctets, outOctets);
                acc[name] = {
                    inputUtilization: input,
                    outputUtilization: output
                };
            }
            // Store latest retrieved value so we can calculate the delta on next poll
            self.counterCache.inOctets = inOctets;
            self.counterCache.outOctets = outOctets;
        }, {});

        return _.isEmpty(out) ? null : out;
    };

    // Utilizing the full-duplex bandwidth calculation algorithms from
    // http://www.cisco.com/c/en/us/support/docs/ip/simple-network-management-protocol-snmp/8141-calculate-bandwidth-snmp.html
    SnmpBandwidthMetric.prototype.calculateUtilization = function(
            timeElapsed, speed, lastOctets, octets) {

        return ((octets - lastOctets) * 8 * 100) / (timeElapsed * speed);
    };

    return SnmpBandwidthMetric;
}
