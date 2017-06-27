// Copyright 2015, EMC, Inc.
/* jshint node: true */

'use strict';

var fs = require('fs');

describe("ipmi-parser", function() {
    var parser;
    var ipmiOutMock;
    var ipmiOutMockV11;
    var corruptIpmiOutMock;
    var ipmiDriveHealthOutMock;
    var ipmiMockSelInfo;
    var ipmiMockSelEntry;

    before('ipmi parser before', function() {
        helper.setupInjector([
            helper.require('/lib/utils/job-utils/ipmi-parser')
        ]);

        parser = helper.injector.get('JobUtils.IpmiCommandParser');

        ipmiOutMock = fs
            .readFileSync(__dirname+'/ipmi-sdr-v-output')
            .toString();

        ipmiOutMockV11 = fs
            .readFileSync(__dirname+'/ipmi-sdr-v1.8.11-output')
            .toString();

        corruptIpmiOutMock = fs
            .readFileSync(__dirname+'/corrupt-ipmi-sdr-v-output')
            .toString();

        ipmiDriveHealthOutMock = fs
            .readFileSync(__dirname + '/ipmi-sdr-type-0xd.txt')
            .toString();

        ipmiMockSelInfo = `SEL Information
            Version : 1.5 (v1.5, v2 compliant)
            Entries : 187
            Free Space : 13008 bytes
            Percent Used : 18%
            Last Add Time : 01/01/1970 01:56:22
            Last Del Time : Not Available
            Overflow : false
            Supported Cmds : 'Delete' 'Reserve'`;

        ipmiMockSelEntry = `
            SEL Record ID          : 0001
             Record Type           : 02
             Timestamp             : 01/01/1970 00:16:44
             Generator ID          : 0020
             EvM Revision          : 04
             Sensor Type           : Temperature
             Sensor Number         : 04
             Event Type            : Threshold
             Event Direction       : Assertion Event
             Event Data (RAW)      : 07ffff
             Description           : Upper Non-critical going high

            Sensor ID              : Inlet Temp (0x4)
             Entity ID             : 7.1
             Sensor Type (Threshold)  : Temperature
             Sensor Reading        : 24 (+/- 1) degrees C
             Status                : ok
             Lower Non-Recoverable : na
             Lower Critical        : na
             Lower Non-Critical    : 3.000
             Upper Non-Critical    : 42.000
             Upper Critical        : na
             Upper Non-Recoverable : na
             Positive Hysteresis   : 1.000
             Negative Hysteresis   : 1.000
             Assertions Enabled    : lnc- lcr- unc+ ucr+
             Deassertions Enabled  : lnc- lcr- unc+ ucr+

            FRU Device Description : OEM fru (ID 17) `;

    });

    describe("IPMI extraction", function() {
        function testSdrParser(sdr){
            var sensors = parser.parseSdrData(sdr);
            sensors.should.have.length(sdr.match(/Sensor\ ID/g).length);

            var expectedAssertions = {
                'PSU1 Status (0xe0)': ['Power Supply AC lost'],
                'HDD2 (0x47)': ['Hot Spare', 'In Critical Array']
            };

            var expectedThresholds = {
                'Temp_DIMM_CD (0xad)': 'Upper Critical',
                'Fan_SYS0_1 (0xc0)': 'Lower Critical',
            };

            var expectedProps = [
                'sensorId',
                'entityId',
                'sdrType',
                'sensorType',
                'sensorReading'
            ];

            _.forEach(sensors, function(sensor) {
                //Make sure all expected keys are present.
                _.forEach(expectedProps, function(property) {
                    expect(sensor).to.have.property(property);
                });

                //Make sure sdrType is either Discrete or Threshold
                expect(sensor).to.have.property('sdrType')
                    .and.to.satisfy(function(val) {
                        return val === 'Discrete' || val === 'Threshold';
                    });

                if (sensor.sdrType === 'Discrete') {
                    if (_.has(expectedAssertions, sensor.sensorId)) {
                        expect(sensor).to.have.property('statesAsserted');
                        _.forEach(expectedAssertions[sensor.sensorId],
                        function(assertion) {
                            expect(sensor.statesAsserted).to.include(assertion);
                            expect(sensor.statesAsserted)
                                .not.to.include(sensor.sensorType);
                        });
                    }
                } else {
                    var expectedValue = _.has(expectedThresholds, sensor.sensorId) ?
                        expectedThresholds[sensor.sensorId] : 'ok';
                    expect(sensor.status).to.equal(expectedValue);
                }
            });
        }

        function testParseSelInformationData(sel) {
            var parsed = parser.parseSelInformationData(sel);
            if(sel === "") {
                expect(parsed,"ParseSelInformationData returned non empty value when provided no information.").to.be.empty;
            }
            else {
                // From passed in information there should be 8 keys
                Object.keys(parsed).should.have.length(8);
            }
        }

        function testParseSelData(sel) {
            var expectedProperties = [
                'logId',
                'date',
                'time',
                'sensorType',
                'sensorNumber',
                'event',
                'value'
                ];
            var parsed = parser.parseSelData(sel);
            if(sel === "") {
                expect(parsed,"ParseSelData returned non undefined value when provided no information.").to.be.undefined;
            }
            else {
                // Check if every entry parsed has the expected properties
                _.forEach(parsed, function(entry) {
                   _.forEach(expectedProperties, function(property) {
                      expect(entry).to.have.property(property); 
                   });
                   // Cannot be empty for other code to work so the parser sets to 00
                   expect(entry['sensorNumber']).to.not.be.empty;
                });
            }
        }

        function testParseSelDataEntries(sel) {
            var parsed = parser.parseSelDataEntries(sel);
            if(sel === "") {
                expect(parsed,"ParseSelDataEntries returned non empty value when provided no information.").to.be.empty;
            }
        }

        it("should parse ipmitool -v sdr output", function() {
            testSdrParser(ipmiOutMock);
        });

        it("should parse ipmitool -v sdr output for v1.8.11", function() {
            testSdrParser(ipmiOutMockV11);
        });

        it("should omit corrupt sdr entries", function() {
            var sensors = parser.parseSdrData(corruptIpmiOutMock);
            // There are exactly 91 valid SDRs in the 'corrupt' output
            sensors.should.have.length(91);
        });

        it('should parse ipmitool chassis status raw data output', function() {
            var chassisStatus = parser.parseChassisData("21 10 60 10");
            expect(chassisStatus).to.have.property("uid", "On");
            expect(chassisStatus).to.have.property("power", true);
            chassisStatus = parser.parseChassisData("01 00 40 70");
            expect(chassisStatus).to.have.property("uid", "Off");
            expect(chassisStatus).to.have.property("power", true);
            chassisStatus = parser.parseChassisData("01 00 40");
            expect(chassisStatus).to.have.property("uid", "Off");
            expect(chassisStatus).to.have.property("power", true);
            chassisStatus = parser.parseChassisData("20 10 50 10");
            expect(chassisStatus).to.have.property("uid", "Temporary On");
            expect(chassisStatus).to.have.property("power", false);
            expect(function (){
                parser.parseChassisData("bad data");
            }).to.throw(/Invalid chassis status output :/);
        });

        it('should parse ipmitool -c sdr type 0xd (drive health status) output', function() {
            var status = parser.parseDriveHealthData(ipmiDriveHealthOutMock);
            expect(status.length).to.equals(10);
            var expectedStatus = [
                "Drive Present",
                "Drive Fault",
                "Predictive Failure",
                "Hot Spare",
                "Parity Check In Progress",
                "In Critical Array",
                "In Failed Array",
                "Rebuild In Progress",
                "Rebuild Aborted",
                "Not Present"
            ];
            _.forEach(status, function(item, idx) {
                expect(item).to.have.property("name", "HDD%s".format(idx));
                expect(item).to.have.property("status", expectedStatus[idx]);
            });
        });

        it('SEL parsers should handle empty SEL data parsing', function() {
            testParseSelInformationData("");
            testParseSelData("");
            testParseSelDataEntries("");
        });

        it('ParseSelInformationData should parse ipmi SEL Information output', function() {
            testParseSelInformationData(ipmiMockSelInfo);
        });

        it('ParseSelData should parse individual sel entries corectly', function() {
            testParseSelData('b,06/20/2017,13:35:00,Power Supply #0xe1,Power Supply AC lost,Asserted');
        });

        it('ParseSelData should parse individual sel entries corectly with missing fields', function() {
            testParseSelData(',,,,,');
        });

        it('ParseSelData should parse multiple sel entries corectly', function() {
            testParseSelData('b,06/20/2017,13:35:00,Power Supply #0xe1,Power Supply AC lost,Asserted\n ,,,,,');
        });

        it('ParseSelData should parse invalid sel entries corectly', function() {
            expect(parser.parseSelData('06/20/2017,13:35:00,Power Supply #0xe1,Power Supply AC lost,Asserted')).to.be.empty;
        });

        it('ParseSelData should handle SEL Entry corectly', function() {
            testParseSelData('SEL Entry \n b,06/20/2017,13:35:00,Power Supply #0xe1,Power Supply AC lost,Asserted');
        });

        it('ParseSelDataEntry should parse ipmi sel entries correctly', function() {
            testParseSelDataEntries(ipmiMockSelEntry);
        });

        it('ParseSelDataEntry should remove unwanted lines from ipmi sel entries correctly', function() {
            expect(parser.parseSelDataEntries(`\n------\n<<`)).to.be.empty;
        });

    });
});
