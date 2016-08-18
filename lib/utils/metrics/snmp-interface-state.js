// Copyright 2015, EMC, Inc.

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
            'IF-MIB::ifMtu',
            'IF-MIB::ifAdminStatus'
        ];
        SnmpStateMetric.super_.call(this, nodeId, host, community);
    }
    util.inherits(SnmpStateMetric, BaseMetric);

    SnmpStateMetric.prototype.collectMetricData = function() {
        return this.updateOidDescriptionMapByType('names')
        .then(this.collectStateData.bind(this))
        .then(this.calculateState.bind(this));
    };

    SnmpStateMetric.prototype.collectStateData = function(numInterfaces) {
        var self = this;

        return self.snmptool.collectHostSnmp(self.oids, {
            snmpQueryType: 'bulkget',
            maxRepetitions: numInterfaces
        })
        .then(function(result) {
            return result[0].values;
        });
    };

    SnmpStateMetric.prototype.calculateState = function(values) {
        return _.transform(this.oidDescriptionMap[this.nodeId].names, function(acc, name, alias) {
            acc[name] = {
                state: values['IF-MIB::ifOperStatus' + '.' + alias],
                speed: parseInt(values['IF-MIB::ifSpeed' + '.' + alias]),
                mtu: parseInt(values['IF-MIB::ifMtu' + '.' + alias]),
                adminState: values['IF-MIB::ifAdminStatus' + '.' + alias]
            };
            acc[name].linkError = (acc[name].adminState === 'up') ? (acc[name].state === 'down') : false;
        }, {});
    };

    return SnmpStateMetric;
}
