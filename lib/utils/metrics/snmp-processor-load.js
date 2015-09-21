// Copyright 2015, EMC, Inc.
/* jshint node: true */

'use strict';

var di = require('di');

module.exports = snmpProcessorLoadMetricFactory;
di.annotate(snmpProcessorLoadMetricFactory,
        new di.Provide('JobUtils.Metrics.Snmp.ProcessorLoadMetric'));
di.annotate(snmpProcessorLoadMetricFactory, new di.Inject(
    'JobUtils.Metrics.Snmp.Base',
    'Assert',
    'Util',
    'Promise',
    '_'
));
function snmpProcessorLoadMetricFactory(
    BaseMetric,
    assert,
    util,
    Promise,
    _
) {
    function SnmpProcessorLoadMetric(nodeId, host, community) {
        SnmpProcessorLoadMetric.super_.call(this, nodeId, host, community);
    }
    util.inherits(SnmpProcessorLoadMetric, BaseMetric);

    SnmpProcessorLoadMetric.prototype.collectMetricData = function() {
        var self = this;

        return self.identify()
        .then(function() {
            if (self.nodeType !== 'cisco') {
                return self.updateOidDescriptionMapByType('processors');
            }
        })
        .then(self.collectProcessorLoadData.bind(self))
        .then(self.calculateProcessorLoad.bind(self));
    };

    SnmpProcessorLoadMetric.prototype.collectProcessorLoadData = function() {
        var oids = [];
        var snmpQueryType = 'walk';
        var maxRepetitions = null;

        if (this.nodeType === 'cisco') {
            oids = [
                'CISCO-PROCESS-MIB::cpmCPUTotalPhysicalIndex',
                'CISCO-PROCESS-MIB::cpmCPUTotal5secRev',
                'CISCO-PROCESS-MIB::cpmCPUTotal1minRev',
                'CISCO-PROCESS-MIB::cpmCPUTotal5minRev'
            ];
            snmpQueryType = 'bulkget';
            maxRepetitions = 1;
        } else {
            oids = ['HOST-RESOURCES-MIB::hrProcessorLoad'];
        }

        return this.snmptool.collectHostSnmp(oids, {
            snmpQueryType: snmpQueryType,
            maxRepetitions: maxRepetitions
        })
        .then(function(result) {
            return result[0].values;
        });
    };

    SnmpProcessorLoadMetric.prototype.calculateProcessorLoad = function(values) {
        if (this.nodeType === 'cisco') {
            return this._calculateCiscoProcessorLoad(values);
        } else {
            return this._calculateProcessorLoad(values);
        }
    };

    SnmpProcessorLoadMetric.prototype._calculateProcessorLoad = function(values) {
        return _.transform(this.oidDescriptionMap[this.nodeId].processors,
                function(acc, name, alias) {
            acc[name] = {
                load: parseInt(values['HOST-RESOURCES-MIB::hrProcessorLoad' + '.' + alias])
            };
        }, {});
    };

    SnmpProcessorLoadMetric.prototype._calculateCiscoProcessorLoad = function(values) {
        var out = {};
        var index = _.last(_.first(_.keys(values)).split('.'));
        out[values['CISCO-PROCESS-MIB::cpmCPUTotalPhysicalIndex' + '.' + index]] = {
            loadAverage5sec: values['CISCO-PROCESS-MIB::cpmCPUTotal5secRev' + '.' + index],
            loadAverage1min: values['CISCO-PROCESS-MIB::cpmCPUTotal1minRev' + '.' + index],
            loadAverage5min: values['CISCO-PROCESS-MIB::cpmCPUTotal5minRev' + '.' + index]
        };
        return out;
    };

    return SnmpProcessorLoadMetric;
}
