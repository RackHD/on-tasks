// Copyright 2016, EMC, Inc.

'use strict';

var di = require('di');

module.exports = snmpSwitchSensorMetricFactory;
di.annotate(snmpSwitchSensorMetricFactory, new di.Provide('JobUtils.Metrics.Snmp.SwitchSensorMetric'));
di.annotate(snmpSwitchSensorMetricFactory, new di.Inject(
    'JobUtils.Metrics.Snmp.Base',
    'Assert',
    'Util',
    '_',
    'Services.Waterline',
    'Services.Environment',
    'Constants'
));

function snmpSwitchSensorMetricFactory(
    BaseMetric,
    assert,
    util,
    _,
    waterline,
    env,
    Constants
) {
    var defaultSnmpConfig = {};

    function SnmpSwitchSensorMetric(nodeId, host, community) {
        SnmpSwitchSensorMetric.super_.call(this, nodeId, host, community);
        this.envConfig = waterline.nodes.needByIdentifier(nodeId)
        .then(function(node) {
            if(node.sku) {
                return env.get('config.snmp', defaultSnmpConfig, [node.sku, Constants.Scope.Global]);
            }
            return defaultSnmpConfig;
        });
    }
    util.inherits(SnmpSwitchSensorMetric, BaseMetric);

    SnmpSwitchSensorMetric.prototype.collectMetricData = function() {
        var self = this;
        return self.identify()
        .then(self.collectSensorData.bind(self))
        .then(self.calculateSensorData.bind(self));
    };

    SnmpSwitchSensorMetric.prototype.collectSensorData = function() {
        var self = this;
        
        return self.envConfig
        .then(function(config) {
            if(_.has(config, 'sensorOids')) {
                return self.snmptool.collectHostSnmp(config.sensorOids, {
                    snmpQueryType: 'bulkwalk',
                    isSequential: true,
                    numericOutput: true
                });
            }
        });
    };

    SnmpSwitchSensorMetric.prototype.calculateSensorData = function(values) {
        return _.reduce(values, function(result, obj) {
            _.forEach(obj.values, function(val, key) {
                if(_.includes(key, obj.source)) {
                    result[key] = val;
                } else {
                    result[obj.source] = 'No Such Instance currently exists at this OID';
                }
            });
            return result;
        }, {});
    };

    return SnmpSwitchSensorMetric;
}
