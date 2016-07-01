// Copyright 2016, EMC, Inc.
/* jshint node: true */

'use strict';

describe("SNMP PDU Sensor Metric", function () {
    var waterline;
    var SnmpPduSensorMetric;
    var metric;

    before('SNMP PDU Sensor Metric before', function () {
        helper.setupInjector([
            helper.require('/lib/utils/metrics/base-metric.js'),
            helper.require('/lib/utils/metrics/snmp-pdu-sensor-status.js'),
            helper.require('/lib/utils/job-utils/net-snmp-tool.js'),
            helper.require('/lib/utils/job-utils/net-snmp-parser.js')
        ]);

        SnmpPduSensorMetric =
            helper.injector.get('JobUtils.Metrics.Snmp.PduSensorMetric');
        waterline = helper.injector.get('Services.Waterline');
    });

    beforeEach('SNMP PDU Sensor Metric beforeEach', function() {
        metric = new SnmpPduSensorMetric('testnodeid', 'testhost', 'testcommunity');
        waterline.catalogs = {
            findMostRecent: sinon.stub().resolves()
        };
    });

    it('should have a collectMetricData function', function() {
        expect(metric).to.have.property('collectMetricData').that.is.a('function');
    });

    it('should collect pdu sensor data for Sinetica(Panduit) iPDU', function() {
        metric.snmptool = { collectHostSnmp: sinon.stub() };
        var testCommand = ['HAWK-I2-MIB::test'];
        var values = [{ source: 'testSource',
                       values: {
                           'testoid1': '1'
                       }
        }];
        var expectValues = {
                             source: 'testSource',
                             values: {
                                 'testoid1': '1'
                             }
        };
        metric.snmptool.collectHostSnmp.resolves(values);

        return expect(metric._collectSineticaSensorData(testCommand))
            .to.eventually.deep.equal(expectValues);
    });

    it('should collect pdu sensor data for Sinetica(Panduit) iPDU', function() {
        metric.snmptool = { collectHostSnmp: sinon.stub() };
        var testCommand = ['HAWK-I2-MIB::test'];
        metric.snmptool.collectHostSnmp.rejects();
        return expect(metric._collectSineticaSensorData(testCommand))
            .to.eventually.deep.equal(undefined);
    });

    it('should calculate pdu sensor data for Sinetica(Panduit) iPDU', function() {
        var source = 'ipTHA';
        var sensorData = {
            'HAWK-I2-MIB::ipTHAChan.1': '1',
            'HAWK-I2-MIB::ipTHARS.1': 'active',
            'HAWK-I2-MIB::ipTHAName.1': 'Input 01',
            'HAWK-I2-MIB::ipTHALocn.1': 'MCU',
            'HAWK-I2-MIB::ipTHAType.1': 'temperature'
        };
        /*jshint camelcase: false */
        var data = {
            channel_1:
            {
                'ipTHAChan.1': '1',
                'ipTHARS.1':   'active',
                'ipTHAName.1': 'Input 01',
                'ipTHALocn.1': 'MCU',
                'ipTHAType.1': 'temperature'
            }
        };
        expect(metric._calculateSineticaSensorData(sensorData, source))
            .to.deep.equal(data);
    });

    it('should call correct sensor collection function based on node type', function() {
        metric._collectSineticaSensorData = sinon.stub();

        metric.nodeType = 'sinetica';
        metric.collectSensorData({});
        expect(metric._collectSineticaSensorData).to.have.been.calledTwice;
    });

    it('should call correct sensor calculation function based on node type', function() {
        /*jshint camelcase: false */
        var data = {
            channel_1:
            {
                'ipTHAChan.1': '1',
                'ipTHARS.1':   'active',
                'ipTHAName.1': 'Input 01',
                'ipTHALocn.1': 'MCU',
                'ipTHAType.1': 'temperature'
            }
        };
        var values = [{ source: 'HAWK-I2-MIB::ipTHATable',
            values: {
                'HAWK-I2-MIB::ipTHAChan.1': '1',
                'HAWK-I2-MIB::ipTHARS.1': 'active',
                'HAWK-I2-MIB::ipTHAName.1': 'Input 01',
                'HAWK-I2-MIB::ipTHALocn.1': 'MCU',
                'HAWK-I2-MIB::ipTHAType.1': 'temperature'
            }
        }];
        metric._calculateSineticaSensorData= sinon.stub();
        metric.nodeType = 'sinetica';
        metric._calculateSineticaSensorData.returns(data);
        expect(metric.calculateSensorData(values)).to.deep.equal(data);
    });

});
