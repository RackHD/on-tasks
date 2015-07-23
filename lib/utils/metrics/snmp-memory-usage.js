// Copyright 2014-2015, Renasar Technologies Inc.
/* jshint node: true */

'use strict';

var di = require('di');

module.exports = snmpRamUsageMetricFactory;
di.annotate(snmpRamUsageMetricFactory,
        new di.Provide('JobUtils.Metrics.Snmp.MemoryUsageMetric'));
di.annotate(snmpRamUsageMetricFactory, new di.Inject(
    'JobUtils.Metrics.Snmp.Base',
    'Assert',
    'Util',
    '_'
));
function snmpRamUsageMetricFactory(
    BaseMetric,
    assert,
    util,
    _
) {
    function SnmpRamUsageMetric(nodeId, host, community) {
        this.oids = [
            'HOST-RESOURCES-MIB::hrStorageUsed'
        ];
        SnmpRamUsageMetric.super_.call(this, nodeId, host, community);
    }
    util.inherits(SnmpRamUsageMetric, BaseMetric);

    SnmpRamUsageMetric.prototype.collectMetricData = function() {
        return this.updateOidDescriptionMapByType('storage')
        .then(this.collectMemoryUsageData.bind(this));
    };

    SnmpRamUsageMetric.prototype.collectMemoryUsageData = function() {
        var self = this;

        return self.snmptool.collectHostSnmp(self.oids)
        .then(function(result) {
            return self.calculateMemoryUsage(result[0].values);
        });
    };

    SnmpRamUsageMetric.prototype.calculateMemoryUsage = function(values) {
        return _.transform(this.oidDescriptionMap[this.nodeId].storage,
                function(acc, name, alias) {
            if (name.startsWith('RAM')) {
                acc[name] = {
                    usage: parseInt(values['HOST-RESOURCES-MIB::hrStorageUsed' + '.' + alias])
                };
            }
        }, {});
    };

    return SnmpRamUsageMetric;
}
