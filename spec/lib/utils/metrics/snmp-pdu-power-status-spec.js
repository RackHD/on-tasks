// Copyright 2015, EMC, Inc.
/* jshint node: true */

'use strict';

describe("SNMP PDU Power Metric", function () {
    var waterline;
    var SnmpPduPowerMetric;
    var metric;
    var taskProtocol = {
        publishPollerAlert: sinon.stub().resolves()
    };

    before('SNMP PDU Power Metric before', function () {
        helper.setupInjector([
            helper.require('/lib/utils/metrics/base-metric.js'),
            helper.require('/lib/utils/metrics/snmp-pdu-power-status.js'),
            helper.require('/lib/utils/job-utils/net-snmp-tool.js'),
            helper.require('/lib/utils/job-utils/net-snmp-parser.js'),
            helper.di.simpleWrapper(taskProtocol, 'Protocol.Task')
        ]);

        SnmpPduPowerMetric =
            helper.injector.get('JobUtils.Metrics.Snmp.PduPowerMetric');
        waterline = helper.injector.get('Services.Waterline');
    });

    beforeEach('SNMP PDU Power Metric beforeEach', function() {
        metric = new SnmpPduPowerMetric('testnodeid', 'testhost', 'testcommunity');
        waterline.catalogs = {
            findMostRecent: sinon.stub().resolves()
        };
        taskProtocol.publishPollerAlert.reset();
    });

    it('should have a collectMetricData function', function() {
        expect(metric).to.have.property('collectMetricData').that.is.a('function');
    });

    it('should collect pdu power data for Sinetica(Panduit) iPDU', function() {
        metric.snmptool = { collectHostSnmp: sinon.stub() };
        var values = { testoid1: '1'};
        var expectValues = {
             pdusResult: [
                {
                    values: {
                        'testoid1': '1'
                    }
                }
            ],
            outletsResult: [
                {
                    values: {
                        'testoid1': '1'
                    }
                }
            ]
        };
        metric.snmptool.collectHostSnmp.resolves([ { values: values } ]);

        return expect(metric._collectSineticaPowerData()).to.eventually.deep.equal(expectValues);
    });

    it('should calculate pdu power data for Sinetica(Panduit) iPDU', function() {
        var values = {
            pdusResult: [
                {
                    source: 'HAWK-I2-MIB::pduRMSVoltsValue',
                    values: {
                        'HAWK-I2-MIB::pduRMSVoltsValue.1': '200'
                    }
                }

            ],
            outletsResult: [
                {
                    source: 'HAWK-I2-MIB::pduOutRMSAmpsValue',
                    values: {
                        'HAWK-I2-MIB::pduOutRMSAmpsValue.1.2': '10'
                    }
                }
            ]
        };
        expect(metric._calculateSineticaPowerData(values)).to.deep.equal({
            'PDU_1': {
                'pduRMSVoltsValue': '200 Volts',
                'outlets': {
                    'outlet_2': {
                        'pduOutRMSAmpsValue': '1 Amps'
                    }
                }
            }
        });
    });

    it('should call correct power collection function based on node type', function() {
        metric._collectSineticaPowerData = sinon.stub();

        metric.nodeType = 'sinetica';
        metric.collectPowerData({});
        expect(metric._collectSineticaPowerData).to.have.been.calledOnce;
    });

    it('should call correct power calculation function based on node type', function() {
        var currentResult = {
            'PDU_1': {
                'outlets': {
                    'outlet_1': {
                        'pduOutOn': 'on',
                        'pduOutName': 'A01'
                    }
                }
            },
            'PDU_Aggregate': {}
        };
        var lastResult = _.cloneDeep(currentResult);
        lastResult['PDU_1']['outlets']['outlet_1']['pduOutOn'] = 'off';
        var testData = {
            cache: { 'abc': { 'snmp-pdu-power-status': lastResult } },
            config: { metric: 'snmp-pdu-power-status' },
            workItemId: 'abc',
            routingKey: '0e2c320f-f29e-47c6-be18-0c833e0f080c'
        };
        metric._calculateSineticaPowerData = sinon.stub().resolves(currentResult);
        metric.data = testData;
        metric.nodeType = 'sinetica';
        return metric.calculatePowerData(testData)
        .then(function(result) {
            expect(result).to.deep.equal(currentResult);
            expect(metric._calculateSineticaPowerData).to.have.been.calledOnce;
            expect(taskProtocol.publishPollerAlert).to.have.been.calledOnce;       
        });
    });
});
