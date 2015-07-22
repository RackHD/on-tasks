// Copyright 2014-2015, Renasar Technologies Inc.
/* jshint node: true */

'use strict';

var di = require('di');

module.exports = snmpInterfaceLinkStateMetricFactory;
di.annotate(snmpInterfaceLinkStateMetricFactory,
        new di.Provide('JobUtils.Metrics.Snmp.InterfaceLinkStateMetric'));
function snmpInterfaceLinkStateMetricFactory() {
    function SnmpInterfaceLinkStateMetric() {
        this.oids = [
            'IF-MIB::ifOperState',
        ];
    }

    SnmpInterfaceLinkStateMetric.prototype.collectMetricData = function(data) {
        return data;
    };

    return new SnmpInterfaceLinkStateMetric();
}
