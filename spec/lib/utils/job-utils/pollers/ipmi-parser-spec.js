// Copyright 2014-2015, Renasar Technologies Inc.
/* jshint node: true */

'use strict';

var fs = require('fs');

describe("ipmi-parser", function() {
    var parser;
    var ipmiOutMock;

    before('ipmi parser before', function() {
        helper.setupInjector([
            helper.require('/lib/utils/job-utils/ipmi-parser')
        ]);

        parser = helper.injector.get('JobUtils.IpmiCommandParser');

        ipmiOutMock = fs
            .readFileSync(__dirname+'/ipmi-sdr-c-output')
            .toString();
    });

    describe("IPMI extraction", function() {
        it("should parse ipmitool -v sdr output", function() {
            var samples = parser.parseSdrData(ipmiOutMock);

            /*
                [
                    // Long format
                    {
                        'Entity Id': '7.18',
                        'Status': 'ok',
                        'Sensor Id': 'VBAT',
                        'Normal Minimum': '8.928',
                        'Lower non-critical': '2.688',
                        'Upper critical': '3.456',
                        'Sensor Reading': '3.168',
                        'Upper non-critical': '3.312',
                        'Lower critical': '2.544',
                        'Sensor Type': 'Voltage',
                        'Normal Maximum': '11.424',
                        'Entry Id Name': 'System Board',
                        'Sensor Reading Units': 'Volts',
                        'Nominal Reading': '9.216'
                    },
                    // Short format
                    {
                        'Entity Id': '10.1',
                        'Status': 'ok',
                        'Sensor Id': 'PS1 Status',
                        'States Asserted': 'Presence detected'
                    }
                ]
            */

            // Make the array an object with keys to make testing assertions easier below
            // Run assertions on the objects while we transform as well as an optimization.
            var samplesObj = _.transform(samples, function(result, sample) {
                var length = _.keys(sample).length;
                expect(['ok', 'ns']).to.include(sample.Status);
                expect([4, 14]).to.contain(length);
                if (length === 4) {
                    expect(sample).to.have.property('States Asserted');
                } else {
                    expect(parseFloat(sample['Sensor Reading'])).to.be.a('number');
                }

                result[sample['Sensor Id']] = sample;
            }, {});

            // Long format parsing assertions
            var columnsLongKeys = [
                "Sensor Id",
                "Sensor Reading",
                "Sensor Reading Units",
                "Status",
                "Entity Id",
                "Entry Id Name",
                "Sensor Type",
                "Nominal Reading",
                "Normal Minimum",
                "Normal Maximum",
                "Upper critical",
                "Upper non-critical",
                "Lower critical",
                "Lower non-critical"
            ];
            var vrdimm = samplesObj['Temp_VR_DIMM_CD.'];
            _.forEach(columnsLongKeys, function(key) {
                try {
                    expect(vrdimm).to.have.property(key);
                } catch (e) {
                    key, vrdimm;
                }
            });

            // Short format parsing assertions
            var columnsShortKeys = [
                "Sensor Id",
                "Status",
                "Entity Id",
                "States Asserted"
            ];
            var button = samplesObj.Button;
            _.forEach(columnsShortKeys, function(key) {
                expect(button).to.have.property(key);
            });
            _.forEach(_.range(0, 5), function(i) {
                expect(samplesObj).to.have.deep.property('HDD%s.States Asserted'.format(i))
                    .that.equals('Drive Present');
                expect(samplesObj).to.have.deep.property('HDD%s.Entity Id'.format(i))
                    .that.equals('26.' + i);
            });
            expect(samplesObj).to.have.deep.property('CMC_LINK_BRD_STA.States Asserted')
                .that.equals('');
        });

        it('should parse ipmitool chassis status raw data output', function() {
            var chassisStatus = parser.parseChassisData("21 10 60 10");
            expect(chassisStatus).to.have.property("uid", "On");
            expect(chassisStatus).to.have.property("power", true);
            chassisStatus = parser.parseChassisData("01 00 40 70");
            expect(chassisStatus).to.have.property("uid", "Off");
            expect(chassisStatus).to.have.property("power", true);
            chassisStatus = parser.parseChassisData("20 10 50 10");
            expect(chassisStatus).to.have.property("uid", "Temporary On");
            expect(chassisStatus).to.have.property("power", false);
            expect(function (){
                parser.parseChassisData("bad data");
            }).to.throw(/Invalid chassis status output :/);
        });
    });
});
