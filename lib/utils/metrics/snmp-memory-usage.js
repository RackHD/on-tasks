// Copyright 2015, EMC, Inc.
/* jshint node: true */

'use strict';

var di = require('di');

module.exports = snmpMemoryUsageMetricFactory;
di.annotate(snmpMemoryUsageMetricFactory,
        new di.Provide('JobUtils.Metrics.Snmp.MemoryUsageMetric'));
di.annotate(snmpMemoryUsageMetricFactory, new di.Inject(
    'JobUtils.Metrics.Snmp.Base',
    'Assert',
    'Util',
    'Promise',
    '_'
));
function snmpMemoryUsageMetricFactory(
    BaseMetric,
    assert,
    util,
    Promise,
    _
) {
    function SnmpMemoryUsageMetric(nodeId, host, community) {
        SnmpMemoryUsageMetric.super_.call(this, nodeId, host, community);
    }
    util.inherits(SnmpMemoryUsageMetric, BaseMetric);

    SnmpMemoryUsageMetric.prototype.collectMetricData = function() {
        var self = this;

        return self.identify()
        .then(function() {
            if (self.nodeType !== 'cisco') {
                return self.updateOidDescriptionMapByType('storage');
            }
        })
        .then(self.collectMemoryUsageData.bind(self))
        .then(self.calculateMemoryUsage.bind(self));
    };

    SnmpMemoryUsageMetric.prototype.collectMemoryUsageData = function() {
        var oids = [];
        var snmpQueryType = 'walk';
        var maxRepetitions = null;

        if (this.nodeType === 'cisco') {
            oids = [
                'CISCO-PROCESS-MIB::cpmCPUTotalPhysicalIndex',
                'CISCO-PROCESS-MIB::cpmCPUMemoryUsed',
                'CISCO-PROCESS-MIB::cpmCPUMemoryFree'
            ];
            snmpQueryType = 'bulkget';
            maxRepetitions = 1;
        } else {
            oids = ['HOST-RESOURCES-MIB::hrStorageUsed'];
        }

        return this.snmptool.collectHostSnmp(oids, {
            snmpQueryType: snmpQueryType,
            maxRepetitions: maxRepetitions
        })
        .then(function(result) {
            return result[0].values;
        });
    };

    SnmpMemoryUsageMetric.prototype.calculateMemoryUsage = function(values) {
        if (this.nodeType === 'cisco') {
            return this._calculateCiscoMemoryUsage(values);
        } else {
            return this._calculateMemoryUsage(values);
        }
    };

    SnmpMemoryUsageMetric.prototype._calculateMemoryUsage = function(values) {
        return _.transform(this.oidDescriptionMap[this.nodeId].storage,
                function(acc, name, alias) {
            if (name.startsWith('RAM')) {
                acc[name] = {
                    used: parseInt(values['HOST-RESOURCES-MIB::hrStorageUsed' + '.' + alias])
                };
            }
        }, {});
    };

    SnmpMemoryUsageMetric.prototype._calculateCiscoMemoryUsage = function(values) {
        var out = {};
        var index = _.last(_.first(_.keys(values)).split('.'));
        out[values['CISCO-PROCESS-MIB::cpmCPUTotalPhysicalIndex' + '.' + index]] = {
            used: values['CISCO-PROCESS-MIB::cpmCPUMemoryUsed' + '.' + index],
            free: values['CISCO-PROCESS-MIB::cpmCPUMemoryFree' + '.' + index]
        };
        return out;
    };

    return SnmpMemoryUsageMetric;
}
