// Copyright 2015, EMC, Inc.
/* jshint node: true */

'use strict';

describe("SNMP Memory Usage Metric", function () {
    var waterline;
    var SnmpMemoryUsageMetric;
    var metric;

    before('SNMP Memory Usage Metric before', function () {
        helper.setupInjector([
            helper.require('/lib/utils/metrics/base-metric.js'),
            helper.require('/lib/utils/metrics/snmp-memory-usage.js'),
            helper.require('/lib/utils/job-utils/net-snmp-tool.js'),
            helper.require('/lib/utils/job-utils/net-snmp-parser.js')
        ]);

        SnmpMemoryUsageMetric =
            helper.injector.get('JobUtils.Metrics.Snmp.MemoryUsageMetric');
        waterline = helper.injector.get('Services.Waterline');
    });

    beforeEach('SNMP Memory Usage Metric beforeEach', function() {
        metric = new SnmpMemoryUsageMetric('testnodeid', 'testhost', 'testcommunity');
        waterline.catalogs = {
            findMostRecent: sinon.stub().resolves()
        };
    });

    it('should have a collectMetricData function', function() {
        expect(metric).to.have.property('collectMetricData').that.is.a('function');
    });

    it('should collect memory usage data', function() {
        metric.snmptool = { collectHostSnmp: sinon.stub() };
        var values = { testoid1: '1', testoid2: '2' };
        metric.snmptool.collectHostSnmp.resolves([ { values: values } ]);

        return expect(metric.collectMemoryUsageData()).to.eventually.deep.equal(values);
    });

    it('should calculate memory usage data for nodes', function() {
        metric.snmptool = { collectHostSnmp: sinon.stub() };
        metric.snmptool.collectHostSnmp.resolves([
            { values: { '0': 'RAM' } }
        ]);

        return metric.updateOidDescriptionMapByType('storage')
        .then(function() {
            var values = {
                'HOST-RESOURCES-MIB::hrStorageUsed.0': 12523423
            };
            expect(metric._calculateMemoryUsage(values)).to.deep.equal({
                RAM: { used: 12523423 }
            });
        });
    });

    it('should calculate memory usage data for cisco switches', function() {
        var values = {
            'CISCO-PROCESS-MIB::cpmCPUTotalPhysicalIndex.22': '22',
            'CISCO-PROCESS-MIB::cpmCPUMemoryUsed.22': '1234 kilo-bytes',
            'CISCO-PROCESS-MIB::cpmCPUMemoryFree.22': '4321 kilo-bytes',
        };
        expect(metric._calculateCiscoMemoryUsage(values)).to.deep.equal({
            '22': {
                used: '1234 kilo-bytes',
                free: '4321 kilo-bytes'
            }
        });
    });

    it('should call correct memory usage calculation function based on node type', function() {
        metric._calculateMemoryUsage = sinon.stub();
        metric._calculateCiscoMemoryUsage = sinon.stub();

        metric.nodeType = 'arista';
        metric.calculateMemoryUsage({});
        expect(metric._calculateMemoryUsage).to.have.been.calledOnce;
        expect(metric._calculateCiscoMemoryUsage).to.not.have.been.called;

        metric._calculateMemoryUsage.reset();
        metric._calculateCiscoMemoryUsage.reset();

        metric.nodeType = 'cisco';
        metric.calculateMemoryUsage({});
        expect(metric._calculateCiscoMemoryUsage).to.have.been.calledOnce;
        expect(metric._calculateMemoryUsage).to.not.have.been.called;
    });
});
