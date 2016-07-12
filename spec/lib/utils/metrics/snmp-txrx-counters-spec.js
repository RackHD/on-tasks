// Copyright 2016, EMC, Inc.
/* jshint node: true */

'use strict';

describe("SNMP TxRx Counters Metric", function () {
    var waterline;
    var SnmpTxRxCountersMetric;
    var metric;

    before('SNMP TxRx Counters Metric before', function () {
        helper.setupInjector([
            helper.require('/lib/utils/metrics/base-metric.js'),
            helper.require('/lib/utils/metrics/snmp-txrx-counters.js'),
            helper.require('/lib/utils/job-utils/net-snmp-tool.js'),
            helper.require('/lib/utils/job-utils/net-snmp-parser.js')
        ]);

        SnmpTxRxCountersMetric =
            helper.injector.get('JobUtils.Metrics.Snmp.TxRxCountersMetric');
        waterline = helper.injector.get('Services.Waterline');
    });

    beforeEach('SNMP TxRx Counters Metric beforeEach', function() {
        metric = new SnmpTxRxCountersMetric('testnodeid', 'testhost', 'testcommunity');
        waterline.catalogs = {
            findMostRecent: sinon.stub().resolves()
        };
    });

    it('should have a collectMetricData function', function() {
        expect(metric).to.have.property('collectMetricData').that.is.a('function');
    });

    it('should collect counters data', function() {
        metric.snmptool = { collectHostSnmp: sinon.stub() };
        var values = { testoid1: '1', testoid2: '2' };
        metric.snmptool.collectHostSnmp.resolves([ { values: values } ]);

        return expect(metric.collectCounterData()).to.eventually.deep.equal(values);
    });

    it('should calculate counter data from snmp data', function() {
        metric.snmptool = { collectHostSnmp: sinon.stub() };
        metric.snmptool.collectHostSnmp.resolves([
            { values: { '0': 'TestInterface' } }
        ]);

        return metric.updateOidDescriptionMapByType('names')
            .then(function() {
                var values = {
                    'IF-MIB::ifInOctets.0': 1,
                    'IF-MIB::ifInUcastPkts.0':2,
                    'IF-MIB::ifInDiscards.0':3,
                    'IF-MIB::ifInErrors.0':4,
                    'IF-MIB::ifInUnknownProtos.0':5,
                    'IF-MIB::ifOutOctets.0':6,
                    'IF-MIB::ifOutUcastPkts.0':7,
                    'IF-MIB::ifOutDiscards.0':8,
                    'IF-MIB::ifOutErrors.0':9,
                    'IF-MIB::ifOutQLen.0':10,
                    'IF-MIB::ifInMulticastPkts.0':11,
                    'IF-MIB::ifInBroadcastPkts.0':12,
                    'IF-MIB::ifOutMulticastPkts.0':13,
                    'IF-MIB::ifOutBroadcastPkts.0':14,
                    'IF-MIB::ifHCInOctets.0':15,
                    'IF-MIB::ifHCInUcastPkts.0':16,
                    'IF-MIB::ifHCInMulticastPkts.0':17,
                    'IF-MIB::ifHCInBroadcastPkts.0':18,
                    'IF-MIB::ifHCOutOctets.0':19,
                    'IF-MIB::ifHCOutUcastPkts.0':20,
                    'IF-MIB::ifHCOutMulticastPkts.0':21,
                    'IF-MIB::ifHCOutBroadcastPkts.0':22
                };

                expect(metric.calculateCounters(values)).to.deep.equal({
                    TestInterface: {
                        InOctets: 1,
                        InUcastPkts: 2,
                        InDiscards: 3,
                        InErrors: 4,
                        InUnknownProtos: 5,
                        OutOctets: 6,
                        OutUcastPkts: 7,
                        OutDiscards: 8,
                        OutErrors: 9,
                        OutQLen: 10,
                        InMulticastPkts: 11,
                        InBroadcastPkts: 12,
                        OutMulticastPkts: 13,
                        OutBroadcastPkts: 14,
                        HCInOctets: 15,
                        HCInUcastPkts: 16,
                        HCInMulticastPkts: 17,
                        HCInBroadcastPkts: 18,
                        HCOutOctets: 19,
                        HCOutUcastPkts: 20,
                        HCOutMulticastPkts: 21,
                        HCOutBroadcastPkts: 22
                    }
                });
            });
    });
});

