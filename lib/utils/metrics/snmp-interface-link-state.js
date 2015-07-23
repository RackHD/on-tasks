// Copyright 2014-2015, Renasar Technologies Inc.
/* jshint node: true */

'use strict';

var di = require('di');

module.exports = snmpInterfaceLinkStateMetricFactory;
di.annotate(snmpInterfaceLinkStateMetricFactory,
        new di.Provide('JobUtils.Metrics.Snmp.InterfaceLinkStateMetric'));
di.annotate(snmpInterfaceLinkStateMetricFactory, new di.Inject(
    'JobUtils.Metrics.Snmp.Base',
    'Assert',
    'Util',
    '_'
));
function snmpInterfaceLinkStateMetricFactory(
    BaseMetric,
    assert,
    util,
    _
) {
    function SnmpLinkStateMetric(nodeId, host, community) {
        this.oids = [
            'IF-MIB::ifOperStatus',
        ];
        SnmpLinkStateMetric.super_.call(this, nodeId, host, community);
    }
    util.inherits(SnmpLinkStateMetric, BaseMetric);

    SnmpLinkStateMetric.prototype.collectMetricData = function() {
        var self = this;

        // We do this every time rather than cacheing it because currently this
        // can account for VLANs, which could have been created after cataloging.
        return self.updateInterfaceNames(self.node)
        .then(self.collectLinkStateData.bind(self));
    };

    SnmpLinkStateMetric.prototype.collectLinkStateData = function() {
        var self = this;

        return self.snmptool.collectHostSnmp(self.oids)
        .then(function(result) {
            return self.calculateLinkState(result[0].values);
        });
    };

    SnmpLinkStateMetric.prototype.calculateLinkState = function(values) {
        return _.transform(this.interfaceCache[this.nodeId].names, function(acc, name, alias) {
            var state = values['IF-MIB::ifOperStatus' + '.' + alias];
            acc[name] = {
                state: state
            };
        }, {});
    };

    return SnmpLinkStateMetric;
}
