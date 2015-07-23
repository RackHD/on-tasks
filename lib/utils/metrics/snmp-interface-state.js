// Copyright 2014-2015, Renasar Technologies Inc.
/* jshint node: true */

'use strict';

var di = require('di');

module.exports = snmpInterfaceStateMetricFactory;
di.annotate(snmpInterfaceStateMetricFactory,
        new di.Provide('JobUtils.Metrics.Snmp.InterfaceStateMetric'));
di.annotate(snmpInterfaceStateMetricFactory, new di.Inject(
    'JobUtils.Metrics.Snmp.Base',
    'Assert',
    'Util',
    '_'
));
function snmpInterfaceStateMetricFactory(
    BaseMetric,
    assert,
    util,
    _
) {
    function SnmpStateMetric(nodeId, host, community) {
        this.oids = [
            'IF-MIB::ifOperStatus',
            'IF-MIB::ifSpeed',
            'IF-MIB::ifMtu'
        ];
        SnmpStateMetric.super_.call(this, nodeId, host, community);
    }
    util.inherits(SnmpStateMetric, BaseMetric);

    SnmpStateMetric.prototype.collectMetricData = function() {
        return this.updateOidDescriptionMapByType('names')
        .then(this.collectStateData.bind(this));
    };

    SnmpStateMetric.prototype.collectStateData = function(numInterfaces) {
        var self = this;

        return self.snmptool.collectHostSnmp(self.oids, {
            snmpQueryType: 'bulkget',
            maxRepititions: numInterfaces
        })
        .then(function(result) {
            return self.calculateState(result[0].values);
        });
    };

    SnmpStateMetric.prototype.calculateState = function(values) {
        return _.transform(this.oidDescriptionMap[this.nodeId].names, function(acc, name, alias) {
            acc[name] = {
                state: values['IF-MIB::ifOperStatus' + '.' + alias],
                speed: parseInt(values['IF-MIB::ifSpeed' + '.' + alias]),
                mtu: parseInt(values['IF-MIB::ifMtu' + '.' + alias])
            };
        }, {});
    };

    return SnmpStateMetric;
}
