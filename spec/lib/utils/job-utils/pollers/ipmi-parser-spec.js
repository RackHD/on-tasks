// Copyright 2015, EMC, Inc.
/* jshint node: true */

'use strict';

var fs = require('fs');

describe("ipmi-parser", function() {
    var parser;
    var ipmiOutMock;
    var corruptIpmiOutMock;
    var ipmiDriveHealthOutMock;

    before('ipmi parser before', function() {
        helper.setupInjector([
            helper.require('/lib/utils/job-utils/ipmi-parser')
        ]);

        parser = helper.injector.get('JobUtils.IpmiCommandParser');

        ipmiOutMock = fs
            .readFileSync(__dirname+'/ipmi-sdr-v-output')
            .toString();

        corruptIpmiOutMock = fs
            .readFileSync(__dirname+'/corrupt-ipmi-sdr-v-output')
            .toString();

        ipmiDriveHealthOutMock = fs
            .readFileSync(__dirname + '/ipmi-sdr-type-0xd.txt')
            .toString();
    });

    describe("IPMI extraction", function() {
        it("should parse ipmitool -v sdr output", function() {
            var sensors = parser.parseSdrData(ipmiOutMock);
            sensors.should.have.length(ipmiOutMock.match(/Sensor\ ID/g).length);

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
                        expectedThresholds[sensor.sensorId] : 'ok'
                    expect(sensor.status).to.equal(expectedValue);
                }
            });
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
    });
});
