// Copyright 2016, EMC, Inc.

'use strict';

var di = require('di');

module.exports = snmpTxRxCountersMetricFactory;
di.annotate(snmpTxRxCountersMetricFactory,
    new di.Provide('JobUtils.Metrics.Snmp.TxRxCountersMetric'));
di.annotate(snmpTxRxCountersMetricFactory, new di.Inject(
    'JobUtils.Metrics.Snmp.Base',
    'Assert',
    'Util',
    '_'
));

function snmpTxRxCountersMetricFactory(
    BaseMetric,
    assert,
    util,
    _
) {
    function SnmpTxRxCountersMetric(nodeId, host, community) {

        SnmpTxRxCountersMetric.super_.call(this, nodeId, host, community);

        this.oids = [
            'IF-MIB::ifInOctets',
            'IF-MIB::ifInUcastPkts',
            'IF-MIB::ifInDiscards',
            'IF-MIB::ifInErrors',
            'IF-MIB::ifInUnknownProtos',
            'IF-MIB::ifOutOctets',
            'IF-MIB::ifOutUcastPkts',
            'IF-MIB::ifOutDiscards',
            'IF-MIB::ifOutErrors',
            'IF-MIB::ifOutQLen',
            'IF-MIB::ifInMulticastPkts',
            'IF-MIB::ifInBroadcastPkts',
            'IF-MIB::ifOutMulticastPkts',
            'IF-MIB::ifOutBroadcastPkts',
            'IF-MIB::ifHCInOctets',
            'IF-MIB::ifHCInUcastPkts',
            'IF-MIB::ifHCInMulticastPkts',
            'IF-MIB::ifHCInBroadcastPkts',
            'IF-MIB::ifHCOutOctets',
            'IF-MIB::ifHCOutUcastPkts',
            'IF-MIB::ifHCOutMulticastPkts',
            'IF-MIB::ifHCOutBroadcastPkts'
        ];
    }

    util.inherits(SnmpTxRxCountersMetric, BaseMetric);

    SnmpTxRxCountersMetric.prototype.collectMetricData = function() {
        return this.updateOidDescriptionMapByType('names')
            .then(this.collectCounterData.bind(this))
            .then(this.calculateCounters.bind(this));
    };

    SnmpTxRxCountersMetric.prototype.collectCounterData = function() {
        var self = this;

        return self.snmptool.collectHostSnmp(self.oids, {
            snmpQueryType: 'bulkget',
            maxRepetitions: null
        })
        .then(function(result) {
            return result[0].values;
        });
    };

    SnmpTxRxCountersMetric.prototype.calculateCounters = function(values) {
        var self = this;

        return _.transform(this.oidDescriptionMap[this.nodeId].names, function(acc, name, alias) {
            acc[name]={};

            self.oids.forEach( function(oid) {
                //var item = oid;
                var item = oid.replace('IF-MIB::if','');  // remove IF-MIB:: from string

                acc[name][item] = parseInt(values[oid + '.' + alias]);
            });

        }, {});
    };

    return SnmpTxRxCountersMetric;
}
