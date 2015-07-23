// Copyright 2014-2015, Renasar Technologies Inc.
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
    '_'
));
function snmpProcessorLoadMetricFactory(
    BaseMetric,
    assert,
    util,
    _
) {
    function SnmpProcessorLoadMetric(nodeId, host, community) {
        this.oids = [
            'HOST-RESOURCES-MIB::hrProcessorLoad'
        ];
        SnmpProcessorLoadMetric.super_.call(this, nodeId, host, community);
    }
    util.inherits(SnmpProcessorLoadMetric, BaseMetric);

    SnmpProcessorLoadMetric.prototype.collectMetricData = function() {
        return this.updateOidDescriptionMapByType('processors')
        .then(this.collectProcessorLoadData.bind(this));
    };

    SnmpProcessorLoadMetric.prototype.collectProcessorLoadData = function() {
        var self = this;

        return self.snmptool.collectHostSnmp(self.oids)
        .then(function(result) {
            return self.calculateProcessorLoad(result[0].values);
        });
    };

    SnmpProcessorLoadMetric.prototype.calculateProcessorLoad = function(values) {
        return _.transform(this.oidDescriptionMap[this.nodeId].processors,
                function(acc, name, alias) {
            acc[name] = {
                load: parseInt(values['HOST-RESOURCES-MIB::hrProcessorLoad' + '.' + alias])
            };
        }, {});
    };

    return SnmpProcessorLoadMetric;
}
