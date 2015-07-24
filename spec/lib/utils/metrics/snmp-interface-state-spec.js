// Copyright 2015, Renasar Technologies Inc.
/* jshint node: true */

'use strict';

describe("SNMP Interface State Metric", function () {
    var waterline;
    var SnmpInterfaceStateMetric;
    var metric;

    before('SNMP Interface State Metric before', function () {
        helper.setupInjector([
            helper.require('/lib/utils/metrics/base-metric.js'),
            helper.require('/lib/utils/metrics/snmp-interface-state.js'),
            helper.require('/lib/utils/job-utils/net-snmp-tool.js'),
            helper.require('/lib/utils/job-utils/net-snmp-parser.js')
        ]);

        SnmpInterfaceStateMetric =
            helper.injector.get('JobUtils.Metrics.Snmp.InterfaceStateMetric');
        waterline = helper.injector.get('Services.Waterline');
    });

    beforeEach('SNMP Interface State Metric beforeEach', function() {
        metric = new SnmpInterfaceStateMetric('testnodeid', 'testhost', 'testcommunity');
        waterline.catalogs = {
            findMostRecent: sinon.stub().resolves()
        };
    });

    it('should have a collectMetricData function', function() {
        expect(metric).to.have.property('collectMetricData').that.is.a('function');
    });

    it('should collect state data', function() {
        metric.snmptool = { collectHostSnmp: sinon.stub() };
        var values = { testoid1: '1', testoid2: '2' };
        metric.snmptool.collectHostSnmp.resolves([ { values: values } ]);

        return expect(metric.collectStateData()).to.eventually.deep.equal(values);
    });

    it('should calculate state data from snmp data', function() {
        metric.snmptool = { collectHostSnmp: sinon.stub() };
        metric.snmptool.collectHostSnmp.resolves([
            { values: { '0': 'TestInterface' } }
        ]);

        return metric.updateOidDescriptionMapByType('names')
        .then(function() {
            var values = {
                'IF-MIB::ifSpeed.0': 100,
                'IF-MIB::ifOperStatus.0': 'up',
                'IF-MIB::ifMtu.0': 1500
            };
            expect(metric.calculateState(values)).to.deep.equal({
                TestInterface: {
                    state: 'up',
                    speed: 100,
                    mtu: 1500
                }
            });
        });
    });
});
