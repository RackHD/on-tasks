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
                        'Sensor ID': 'VBAT',
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
                        'Entity ID': '10.1',
                        'Status': 'ok',
                        'Sensor ID': 'PS1 Status',
                        'States Asserted': 'Presence detected'
                    }
                ]
            */

            _.forEach(samples, function(sample) {
                expect(sample).to.have.property('Status').that.equals('ok');
                var length = _.keys(sample).length;
                expect([4, 14]).to.contain(length);
                if (length === 4) {
                    expect(sample).to.have.property('States Asserted')
                        .that.equals('Presence detected');
                } else {
                    expect(parseFloat(sample['Sensor Reading'])).to.be.a('number');
                }
            });
        });
    });
});
