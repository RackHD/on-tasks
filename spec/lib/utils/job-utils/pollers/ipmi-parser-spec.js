// Copyright 2014-2015, Renasar Technologies Inc.
/* jshint node: true */

'use strict';

var fs = require('fs');
var _ = require('lodash');

var injector = helper.baseInjector.createChild(
    _.flatten([
        helper.require('/lib/jobs/base-job'),
        helper.require('/lib/jobs/ipmi-job'),
        helper.require('/lib/utils/job-utils/ipmitool'),
        helper.require('/lib/utils/job-utils/ipmi-parser')
    ])
);

var parser = injector.get('JobUtils.IpmiCommandParser');

var ipmiOutMock = fs
    .readFileSync(__dirname+'/ipmi-output-helper')
    .toString();

var emcIpmiData = fs
    .readFileSync(__dirname+'/emc-ipmi-sdr-output')
    .toString();

describe("ipmi-parser", function() {

    describe("_processSensor", function() {
        it("should break sensor blocks into key value sets and determine type", function() {
            var x = "Sensor ID              : Pwr Unit Redund (0x2)\n" +
                "Entity ID             : 21.2 (Power Management)\n" +
                "Sensor Type (Discrete): Power Unit (0x09)\n" +
                "Sensor Reading        : 0h\n" +
                "Event Message Control : Per-threshold\n" +
                "OEM                   : 0\n";

            var dataObj = parser._processSensor(x);
            expect(dataObj).to.be.ok;
            expect(dataObj).to.have.property('Sensor ID');
            expect(dataObj['Sensor ID']).to.equal("Pwr Unit Redund (0x2)");

            var sensorType = parser._getSensorType(dataObj);
            expect(sensorType).to.be.an("Array");
            expect(sensorType.length).to.equal(1);
            expect(sensorType[0]).to.equal('Sensor Type (Discrete)');
        });

        it("should deal with indents OK", function() {
            var data = "Sensor ID              : Exit Air Temp (0x2e)\n" +
                "Entity ID             : 7.1 (System Board)\n" +
                "Sensor Type (Threshold)  : Temperature (0x01)\n" +
                "Sensor Reading        : 61 (+/- 0) degrees C\n" +
                "Status                : ok\n" +
                "Nominal Reading       : 55.000\n" +
                "Normal Minimum        : 5.000\n" +
                "Normal Maximum        : 75.000\n" +
                "Positive Hysteresis   : 4.000\n" +
                "Negative Hysteresis   : 4.000\n" +
                "Minimum sensor range  : Unspecified\n" +
                "Maximum sensor range  : Unspecified\n" +
                "Event Message Control : Per-threshold\n" +
                "Readable Thresholds   :\n" +
                "    Settable Thresholds   :\n" +
                "    Assertion Events      :\n" +
                "    Assertions Enabled    :\n";

            var dataObj = parser._processSensor(data);
            expect(dataObj).to.have.property('Sensor ID');
            expect(dataObj['Sensor ID']).to.equal("Exit Air Temp (0x2e)");
            expect(dataObj.Status).to.equal("ok");
            expect(dataObj['Sensor Reading']).to.equal("61 (+/- 0) degrees C");

            var sensorType = parser._getSensorType(dataObj);
            expect(sensorType).to.be.an("Array");
            expect(sensorType.length).to.equal(1);
            expect(sensorType[0]).to.equal('Sensor Type (Threshold)');
        });

    });

    it("parses sample data", function() {
        var parsed = parser._parseSensorsData(ipmiOutMock);
        expect(parsed).to.have.property('Sensor Type (Discrete)');
        expect(parsed).to.have.property('Sensor Type (Analog)');
        expect(parsed).to.not.have.property('Sensor Type (Threshold)');

        expect(parsed['Sensor Type (Discrete)']).to.have.property('CPU Temp (0x1)');
        expect(parsed['Sensor Type (Analog)']).to.have.property('System Temp (0x2)');
        expect(parsed['Sensor Type (Analog)']['System Temp (0x2)'].Status).to.equal("ok");
    });
    it("parses emc sample data", function() {
        var parsed = parser._parseSensorsData(emcIpmiData);
        expect(parsed).to.have.property('Sensor Type (Discrete)');
        expect(parsed).to.not.have.property('Sensor Type (Analog)');
        expect(parsed).to.have.property('Sensor Type (Threshold)');

        expect(parsed['Sensor Type (Discrete)']).to.have.property('Pwr Unit Status (0x1)');
        expect(parsed['Sensor Type (Discrete)']['Pwr Unit Status (0x1)']['Sensor Reading'])
            .to.equal('0h');
        expect(parsed['Sensor Type (Threshold)']['P2 MTT (0x35)'].Status).to.equal("ok");
    });
});

describe("IPMI extraction", function() {
    it("should parse ipmitool -v sdr output", function() {
        var samples = parser.parseSdrData(ipmiOutMock);

        /*
         console.log(samples);

         { 'System Temp (0x2)': { value: '38' },
         'CPU Vcore (0x5)': { value: '1.064' },
         'CPU DIMM (0x6)': { value: '1.360' },
         'CPU Mem VTT (0x15)': { value: '0.672' },
         '+1.1 V (0x7)': { value: '1.104' },
         '+1.8 V (0x8)': { value: '1.848' },
         '+5 V (0x9)': { value: '5.056' },
         '+12 V (0xa)': { value: '12.296' },
         '-12 V (0xb)': { value: '-11.416' },
         'HT Voltage (0x16)': { value: '1.184' },
         '+3.3 V (0xc)': { value: '3.312' },
         '+3.3VSB (0xd)': { value: '3.264' },
         'VBAT (0xe)': { value: '3.096' },
         'FAN 1 (0xf)': { value: '3249' },
         'FAN 2 (0x10)': { value: '1296' },
         'FAN 5 (0x13)': { value: '1225' } }
         */

        _.forEach(samples, function(sample) {
            expect(parseFloat(sample.value)).to.be.a('number');
        });

        expect(samples).to.have.property('System Temp (0x2)');
        expect(samples).to.have.property('FAN 1 (0xf)');
        expect(samples['FAN 1 (0xf)'].value).to.equal('3249');
        //console.log(samples);
    });

    it("should parse the ipmi sdr data from EMC", function() {
        var samples = parser.parseSdrData(emcIpmiData);
        expect(samples).to.have.property('Exit Air Temp (0x2e)');
        expect(samples['Exit Air Temp (0x2e)'].value).to.equal('ok');
        //console.log(samples);
    });
});
