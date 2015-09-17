// Copyright 2015, EMC, Inc.
/* jshint node: true */

'use strict';

describe("SNMP Processor Load Metric", function () {
    var waterline;
    var SnmpProcessorLoadMetric;
    var metric;

    before('SNMP Processor Load Metric before', function () {
        helper.setupInjector([
            helper.require('/lib/utils/metrics/base-metric.js'),
            helper.require('/lib/utils/metrics/snmp-processor-load.js'),
            helper.require('/lib/utils/job-utils/net-snmp-tool.js'),
            helper.require('/lib/utils/job-utils/net-snmp-parser.js')
        ]);

        SnmpProcessorLoadMetric =
            helper.injector.get('JobUtils.Metrics.Snmp.ProcessorLoadMetric');
        waterline = helper.injector.get('Services.Waterline');
    });

    beforeEach('SNMP Processor Load Metric beforeEach', function() {
        metric = new SnmpProcessorLoadMetric('testnodeid', 'testhost', 'testcommunity');
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

        return expect(metric.collectProcessorLoadData()).to.eventually.deep.equal(values);
    });

    it('should calculate memory usage data for nodes', function() {
        metric.snmptool = { collectHostSnmp: sinon.stub() };
        metric.snmptool.collectHostSnmp.resolves([
            { values: { '0': 'CPU1' } }
        ]);

        return metric.updateOidDescriptionMapByType('processors')
        .then(function() {
            var values = {
                'HOST-RESOURCES-MIB::hrProcessorLoad.0': 9
            };
            expect(metric._calculateProcessorLoad(values)).to.deep.equal({
                CPU1: { load: 9 }
            });
        });
    });

    it('should calculate memory usage data for cisco switches', function() {
        var values = {
            'CISCO-PROCESS-MIB::cpmCPUTotalPhysicalIndex.22': '22',
            'CISCO-PROCESS-MIB::cpmCPUTotal5secRev.22': 9,
            'CISCO-PROCESS-MIB::cpmCPUTotal1minRev.22': 10,
            'CISCO-PROCESS-MIB::cpmCPUTotal5minRev.22': 11
        };
        expect(metric._calculateCiscoProcessorLoad(values)).to.deep.equal({
            '22': {
                loadAverage5sec: 9,
                loadAverage1min: 10,
                loadAverage5min: 11
            }
        });
    });

    it('should call correct memory usage calculation function based on node type', function() {
        metric._calculateProcessorLoad = sinon.stub();
        metric._calculateCiscoProcessorLoad = sinon.stub();

        metric.nodeType = 'arista';
        metric.calculateProcessorLoad({});
        expect(metric._calculateProcessorLoad).to.have.been.calledOnce;
        expect(metric._calculateCiscoProcessorLoad).to.not.have.been.called;

        metric._calculateProcessorLoad.reset();
        metric._calculateCiscoProcessorLoad.reset();

        metric.nodeType = 'cisco';
        metric.calculateProcessorLoad({});
        expect(metric._calculateCiscoProcessorLoad).to.have.been.calledOnce;
        expect(metric._calculateProcessorLoad).to.not.have.been.called;
    });
});
