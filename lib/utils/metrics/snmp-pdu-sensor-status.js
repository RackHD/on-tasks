// Copyright 2016, EMC, Inc.

'use strict';

var di = require('di');

module.exports = snmpPduSensorMetricFactory;
di.annotate(snmpPduSensorMetricFactory,
        new di.Provide('JobUtils.Metrics.Snmp.PduSensorMetric'));
di.annotate(snmpPduSensorMetricFactory, new di.Inject(
    'JobUtils.Metrics.Snmp.Base',
    'Assert',
    'Logger',
    'Util',
    '_'
));

function snmpPduSensorMetricFactory(
    BaseMetric,
    assert,
    Logger,
    util,
    _
) {
    var logger = Logger.initialize(snmpPduSensorMetricFactory);
    function SnmpPduSensorMetric(nodeId, host, community) {
        SnmpPduSensorMetric.super_.call(this, nodeId, host, community);
    }
    util.inherits(SnmpPduSensorMetric, BaseMetric);

    SnmpPduSensorMetric.prototype.collectMetricData = function() {
        var self = this;
        return self.identify()
        .then(self.collectSensorData.bind(self))
        .then(self.calculateSensorData.bind(self));
    };

    SnmpPduSensorMetric.prototype.collectSensorData = function() {
        var self = this;
        if (this.nodeType === 'sinetica') {
            return Promise.all([
                    self._collectSineticaSensorData(['HAWK-I2-MIB::ipTHATable']),
                    self._collectSineticaSensorData(['HAWK-I2-MIB::ipContTable'])
                ])
                .then(function (results) {
                    for (var i = (results.length)-1; i >= 0; i-=1 ) {
                        if (results[i] === undefined) {
                            results.splice(i, 1);
                        }
                    }
                    return (results);
                });
        }
    };

    SnmpPduSensorMetric.prototype.calculateSensorData = function(values) {
        var self = this;
        var out={};
        var data;
        if (this.nodeType === 'sinetica') {
            _.forEach(values, function (value) {
                var source = value.source;
                source = source.substring(source.lastIndexOf(":") + 1,
                    source.indexOf("Table"));
                data= (self._calculateSineticaSensorData(value.values, source));
                var keys = Object.keys(data);
                for(var i = 0 ;i< keys.length; i+=1) {
                    out[keys[i]] = data[keys[i]];
                }
            });
        }
        return out;
    };

    SnmpPduSensorMetric.prototype._collectSineticaSensorData = function(pduOids) {
        var self = this;
        var snmpQueryType = 'bulkwalk';
        return self.snmptool.collectHostSnmp(pduOids, {
            snmpQueryType: snmpQueryType,
            isSequential: true
        })
        .then(function (pduOidsResult) {
            return pduOidsResult[0];

        }).catch(function(err) {
                logger.warning("Sensor command failed", { warning:err });
                return;
            });
    };

    SnmpPduSensorMetric.prototype._calculateSineticaSensorData = function(sensorData, source) {
        /* Get PDUs Sensor information and format it to look like this

         "result": {
            "channel_1": {
                "ipContChan.1": "1",
                "ipContRS.1": "active",
                "ipContName.1": "Input 01",
                ...
                ...
            }
            "channel_2": {
                "ipContChan.2": "2",
                ...
            }
         }
         */
        source += 'Chan.';
        var arr = _.filter(Object.keys(sensorData),function(item) {
            return item.indexOf(source) >= 0;
        });
        var data = {};
        //create data object
        _.forEach(arr, function(arrItem){
            data['channel_'+ sensorData[arrItem]]= {};
            var keys = _.filter(Object.keys(sensorData),function(item) {
                return item.indexOf('.' + sensorData[arrItem]) >= 0;
            });
            _.forEach(keys,function(key){
                var changeKey = key.substring(key.lastIndexOf(":") +1);
                data['channel_'+ sensorData[arrItem]][changeKey] = sensorData[key];
            });
        });
        return data;
    };
    return SnmpPduSensorMetric;
}
