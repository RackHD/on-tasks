// Copyright 2015, EMC, Inc.

'use strict';

var di = require('di');

module.exports = snmpPduPowerMetricFactory;
di.annotate(snmpPduPowerMetricFactory,
        new di.Provide('JobUtils.Metrics.Snmp.PduPowerMetric'));
di.annotate(snmpPduPowerMetricFactory, new di.Inject(
    'JobUtils.Metrics.Snmp.Base',
    'Assert',
    'Util',
    '_',
    'Promise',
    'Protocol.Events',
    'Protocol.Task',
    'Services.Waterline',
    'Services.Environment',
    'Constants'
));

function snmpPduPowerMetricFactory(
    BaseMetric,
    assert,
    util,
    _,
    Promise,
    eventsProtocol,
    taskProtocol,
    waterline,
    env,
    Constants
) {
    function SnmpPduPowerMetric(nodeId, host, community) {
        SnmpPduPowerMetric.super_.call(this, nodeId, host, community);
        this.data = {};
    }

    util.inherits(SnmpPduPowerMetric, BaseMetric);

    SnmpPduPowerMetric.prototype.collectMetricData = function(data) {
        var self = this;
        
        if(data) {
            self.data = data;
        }

        return self.identify()
        .then(self.collectPowerData.bind(self))
        .then(self.calculatePowerData.bind(self));
    };

    SnmpPduPowerMetric.prototype.collectPowerData = function() {
        var self = this;

        if (this.nodeType === 'sinetica') {
            return self._collectSineticaPowerData();
        }
    };

    SnmpPduPowerMetric.prototype.calculatePowerData = function(values) {
        var self = this;
        if (this.nodeType === 'sinetica') {
            return Promise.resolve(self._calculateSineticaPowerData(values))
            .then(function(results) {
                if(_.has(self.data.cache, self.data.workItemId)) {
                    var cache = self.data.cache[self.data.workItemId];
                    if(_.has(cache, self.data.config.metric)) {
                        cache = cache[self.data.config.metric];
                        var lastResults = _(cache)
                        .map(function(pdu) {
                            var outlets = pdu.outlets || [];
                            return _.map(outlets, function(outlet) {
                                return outlet;    
                            });
                        })
                        .sortBy('pduOutName')
                        .flattenDeep()
                        .value();
                        
                        var currentResults = _(results)
                        .map(function(pdu) {
                            var outlets = pdu.outlets || [];
                            return _.map(outlets, function(outlet) {
                                return outlet;
                            });
                        })
                        .sortBy('pduOutName')
                        .flattenDeep()
                        .value();

                        var status = [];
                        _.forEach(lastResults, function(last, i) {
                            if(last.pduOutOn !== currentResults[i].pduOutOn) {
                                status.push({
                                    outlet: currentResults[i].pduOutName,
                                    current: currentResults[i].pduOutOn,
                                    last: last.pduOutOn
                                });
                            }
                        });
                        if(!_.isEmpty(status)) {
                            eventsProtocol.publishExternalEvent({
                                type: 'polleralert',
                                action: 'pdupower.updated',
                                typeId: self.data.workItemId,
                                nodeId: self.data.node,
                                severity: 'information',
                                data: {
                                    host: results.host,
                                    status: status
                                }
                            });
                        }
                    }
                }
                return results;
            });
        }
    };

    SnmpPduPowerMetric.prototype._collectSineticaPowerData = function() {
        var self = this;
         var snmpQueryType = 'bulkwalk';

        // NOTE: Sinetica(Panduit) IPI PDU gateway cannot handle snmp commands concurrently
        // Sending snmp commands concurrently will have a chance to cause PDU no response
        var defaultPduMibs = [
            //PDUs' health and status
            'HAWK-I2-MIB::pduName',
            'HAWK-I2-MIB::pduRS',
            'HAWK-I2-MIB::pduMonEn',
            'HAWK-I2-MIB::pduCommsFail',
            //PDUs' power status
            'HAWK-I2-MIB::pduRMSVoltsValue',
            'HAWK-I2-MIB::pduRMSAmpsValue',
            'HAWK-I2-MIB::pduTotalEnergyValue',
            'HAWK-I2-MIB::pduMeanKVAValue',
            'HAWK-I2-MIB::pduMeanKWattsValue',
            'HAWK-I2-MIB::pduPwrFactorValue',
            'HAWK-I2-MIB::pduPwrSupplyFreq'
                ];

        var defaultOutletOids = [
            //PDU outlets' power status
            'HAWK-I2-MIB::pduOutName',
            'HAWK-I2-MIB::pduOutOn',
            'HAWK-I2-MIB::pduOutRMSAmpsValue',
            'HAWK-I2-MIB::pduOutRMSAmpsPeak',
            'HAWK-I2-MIB::pduOutMeanKVAValue',
            'HAWK-I2-MIB::pduOutKWHrValue',
            'HAWK-I2-MIB::pduOutPFactorValue'
        ];
        
        return waterline.nodes.needByIdentifier(self.nodeId)
        .then(function(node) {
            if(node.sku) {
                return [ 
                    env.get('config.pduMibs', defaultPduMibs, [node.sku, Constants.Scope.Global]),
                    env.get('config.outletMibs', defaultOutletOids, [node.sku, Constants.Scope.Global])
                ];                
            } 
            return [ defaultPduMibs, defaultOutletOids ];
        })
        .spread(function(pduMibs, outletMibs) {
            return self.snmptool.collectHostSnmp(pduMibs, {
                snmpQueryType: snmpQueryType,
                   isSequential: true
            })
            .then(function(pduOidsResult) {
                return self.snmptool.collectHostSnmp(outletMibs, {
                    snmpQueryType: snmpQueryType,
                       isSequential: true
                })
                .then(function(outletOidsResult) {
                    return { 
                        pdusResult: pduOidsResult,
                        outletsResult: outletOidsResult 
                    };
                });
            });
        });
    };

    SnmpPduPowerMetric.prototype._calculateSineticaPowerData = function(powerData) {
        var out = {};
        var unitsMap = { 
            'pduOutName': 'null',
            'pduOutOn': 'null',
            'pduName': 'null',
            'pduRS': 'null',
            'pduMonEn': 'null',
            'pduCommsFail': 'null',
            'pduRMSVoltsValue': {
                'unit': ' Volts',
                'factor': '1'
            },
            'pduRMSAmpsValue': {
                'unit': ' Amps',
                'factor': '0.1'
            },
            'pduTotalEnergyValue': {
                'unit': ' kWh',
                'factor': '0.1'
            },
            'pduMeanKVAValue': {
                'unit': ' kVA',
                'factor': '0.1'
            },
            'pduMeanKWattsValue': {
                'unit': ' kW',
                'factor': '0.1'
            },
            'pduPwrFactorValue': {
                'unit': '',
                'factor': '0.01'
            },
            'pduPwrSupplyFreq': {
                'unit': ' Hz',
                'factor': '0.1'
            },
            'pduOutRMSAmpsValue': {
                'unit': ' Amps',
                'factor': '0.1'
            },
            'pduOutRMSAmpsPeak': {
                'unit': ' Amps',
                'factor': '0.1'
            },
            'pduOutMeanKVAValue': {
                'unit': ' kVA',
                'factor': '0.1'
            },
            'pduOutKWHrValue': {
                'unit': ' kWhr',
                'factor': '0.1'
            },
            'pduOutPFactorValue': {
                'unit': '',
                'factor': '0.01'
            }
        };

        //Get PDU number and initialize the output
        _.forEach(_.keys(powerData.pdusResult[0].values),function (key) {
            var pduNum = _.last(key.split('.'));

            //PDU number '99' is the virtual PDU for Aggregate 
            //Sinetica PDU SNMP display PDU number is 1,4,7,..., convert to 1,2,3,...
            pduNum = (pduNum === '99')? 'Aggregate' : ((+pduNum + 2) / 3);
            out['PDU_' + pduNum] = {};
        });

        /* Get PDUs Monitor information and format it, output like this:
         *  "result": {
         *      "PDU_1": {
         *          ...
         *          "pduMeanKVAValue": "0.2 kVA",
         *          ...
         *          },
         *      "PDU_2": {
         *          ...
         *          }
         *      }
         */
        _.forEach(powerData.pdusResult, function (pduPowerItems) {
            _.forEach(pduPowerItems.values,function (pduPowerItemValue, key) {
                var pduNum = _.last(key.split('.'));
                var pduPowerItem = _.last((_.first(key.split('.'))).split('::'));

                //PDU number '99' is the virtual PDU for Aggregate
                //Sinetica PDU SNMP display PDU number is 1,4,7,..., convert to 1,2,3,...
                pduNum = (pduNum === '99')? 'Aggregate' : ((+pduNum + 2) / 3);

                _.forEach(out, function (value, pdu) {
                    //PDU name is 'PDU_*'
                    if (pdu.split('_')[1] === String(pduNum)) {
                        if (unitsMap[pduPowerItem] !== 'null') {
                            out[pdu][pduPowerItem] =
                    (pduPowerItemValue * unitsMap[pduPowerItem].factor) +
                    unitsMap[pduPowerItem].unit;
                        } else {
                            out[pdu][pduPowerItem] = pduPowerItemValue;
                        }
                    }
                });
            });
        });

        //Get outlet number and initialize the output
        _.forEach(_.keys(powerData.outletsResult[0].values),function (key) {
            //Don't like PDU status, outlet status data don't contain PDU number '99'
            //so don't handle PDU number '99' here like PDU status
            //Sinetica PDU SNMP display PDU number is 1,4,7,..., convert to 1,2,3,...
            var pduNum = (+((key.split('.'))[1]) + 2) / 3;
            var outLetNum = _.last(key.split('.'));
            var pdu = 'PDU_' + pduNum;
            var outlet = 'outlet_' + outLetNum;

            if (!_.has(out, pdu)) {
                return;
            }

            if (!_.has(out[pdu], 'outlets')) {
                out[pdu].outlets = {};
            }

            if (_.has(out[pdu].outlets, outlet)) {
                return;
            } else {
                out[pdu].outlets[outlet] = {};
            }
        });

        /*Get PDUs' Outlets Monitor information and format it, output like this:
         *
         *  "result": {
         *      "PDU_1": {
         *          ...
         *          "outlets": {
         *              "outlet_1": {
         *                  "pduOutKWHrValue": "0 kWhr",
         *                  ...
         *                  },
         *              "outlet_2": {
         *              ...
         */
        _.forEach(powerData.outletsResult, function (outletPowerItems) {
            _.forEach(outletPowerItems.values,function (outletPowerItemValue, key) {
                //Don't like PDU status, outlet status data don't contain PDU number '99'
                //so don't handle PDU number '99' here like PDU status
                //Sinetica PDU SNMP display PDU number is 1,4,7,..., convert to 1,2,3,...
                var pduNum = (+((key.split('.'))[1]) + 2) / 3;
                var outletNum = _.last(key.split('.'));
                var outletPowerItem = _.last((_.first(key.split('.'))).split('::'));

                _.forEach(out, function (value, pdu) {
                    _.forEach(out[pdu].outlets, function (value, outlet) {
                        if (pdu.split('_')[1] === String(pduNum) &&
                            outlet.split('_')[1] === String(outletNum)) {
                            if (unitsMap[outletPowerItem] !== 'null') {
                            out[pdu].outlets[outlet][outletPowerItem] =
                        (outletPowerItemValue * unitsMap[outletPowerItem].factor) +
                        unitsMap[outletPowerItem].unit;
                            } else {
                                out[pdu].outlets[outlet][outletPowerItem] = outletPowerItemValue;
                            }
                        }
                    });
                });
            });
        });

        return out;
    };

    return SnmpPduPowerMetric;
}
