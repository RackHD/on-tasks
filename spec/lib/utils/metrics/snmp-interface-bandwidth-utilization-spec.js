// Copyright 2015, EMC, Inc.
/* jshint node: true */

'use strict';

describe("SNMP Interface Bandwidth Utilization Metric", function () {
    var waterline;
    var SnmpBandwidthMetric;
    var metric;

    before('SNMP Interface Bandwidth Utilization Metric before', function () {
        helper.setupInjector([
            helper.require('/lib/utils/metrics/base-metric.js'),
            helper.require('/lib/utils/metrics/snmp-interface-bandwidth-utilization.js'),
            helper.require('/lib/utils/job-utils/net-snmp-tool.js'),
            helper.require('/lib/utils/job-utils/net-snmp-parser.js')
        ]);

        SnmpBandwidthMetric =
            helper.injector.get('JobUtils.Metrics.Snmp.InterfaceBandwidthUtilizationMetric');
        waterline = helper.injector.get('Services.Waterline');
    });

    beforeEach('SNMP Interface Bandwidth Utilization Metric beforeEach', function() {
        metric = new SnmpBandwidthMetric('testnodeid', 'testhost', 'testcommunity', 10*1000);
        waterline.catalogs = {
            findMostRecent: sinon.stub().resolves()
        };
    });

    it('should have a collectMetricData function', function() {
        expect(metric).to.have.property('collectMetricData').that.is.a('function');
    });

    it('should collect bandwidth data', function() {
        metric.snmptool = { collectHostSnmp: sinon.stub() };
        var values = { testoid1: '1', testoid2: '2' };
        metric.snmptool.collectHostSnmp.resolves([ { values: values } ]);

        return expect(metric.collectBandwidthData()).to.eventually.deep.equal(values);
    });

    it('should calculate bandwidth utilization from SNMP data', function() {
        metric.snmptool = { collectHostSnmp: sinon.stub() };
        metric.snmptool.collectHostSnmp.resolves([
            { values: { '0': 'TestInterface' } }
        ]);

        return metric.updateOidDescriptionMapByType('names')
        .then(function() {
            var firstValues = {
                'IF-MIB::ifSpeed.0': 100,
                'IF-MIB::ifInOctets.0': 1,
                'IF-MIB::ifOutOctets.0': 1
            };
            var secondValues = {
                'IF-MIB::ifSpeed.0': 100,
                'IF-MIB::ifInOctets.0': 2,
                'IF-MIB::ifOutOctets.0': 2
            };
            var thirdValues = {
                'IF-MIB::ifSpeed.0': 100,
                'IF-MIB::ifInOctets.0': 4,
                'IF-MIB::ifOutOctets.0': 4
            };

            // We need at least two measurements to calculate utilization
            expect(metric.calculateBandwidthUtilization(firstValues)).to.equal(null);
            expect(metric.calculateBandwidthUtilization(secondValues))
                .to.have.property('TestInterface').that.deep.equals({
                    inputUtilization: 0.8,
                    outputUtilization: 0.8,
                    unit: 'percent'
                }
            );
            expect(metric.calculateBandwidthUtilization(thirdValues))
                .to.have.property('TestInterface').that.deep.equals({
                    inputUtilization: 1.6,
                    outputUtilization: 1.6,
                    unit: 'percent'
                }
            );
        });
    });

    it('should calculate bandwidth utilization', function() {
        expect(metric.calculateUtilization(10, 100, 1, 2)).to.equal(0.8);
    });
});


