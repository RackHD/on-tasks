// Copyright 2015, Renasar Technologies Inc.
/* jshint node:true */

'use strict';

var uuid = require('node-uuid');

// Various data pieced together from EMC and local data and spit out of parseSdrData()
var _samples = [
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
];

describe(require('path').basename(__filename), function () {
    var _;
    var samples;
    var waterline = {};
    var base = require('./base-spec');

    base.before(function (context) {
        // create a child injector with on-core and the base pieces we need to test this
        helper.setupInjector([
            helper.require('/spec/mocks/logger.js'),
            helper.requireGlob('/lib/services/*.js'),
            helper.require('/lib/utils/job-utils/ipmi-parser.js'),
            helper.require('/lib/jobs/base-job.js'),
            helper.require('/lib/jobs/ipmi-sdr-alert-job.js'),
            helper.require('/lib/jobs/poller-alert-job.js'),
            helper.di.simpleWrapper(waterline, 'Services.Waterline')
        ]);

        _ = helper.injector.get('_');
        context.parser = helper.injector.get('JobUtils.IpmiCommandParser');
        context.Jobclass = helper.injector.get('Job.Poller.Alert.Ipmi.Sdr');
        var alertJob = new context.Jobclass({}, { graphId: uuid.v4() }, uuid.v4());
        context.determineAlert = alertJob._determineAlert;
        samples = _.cloneDeep(_samples);
    });

    describe('Base', function () {
        base.examples();
    });

    describe("ipmi-sdr-alert-job", function() {
        var goodTestSensor,
        badTestSensor,
        data;

        beforeEach(function() {
            this.sandbox = sinon.sandbox.create();
            waterline.workitems = {
                find: this.sandbox.stub().resolves(),
                update: this.sandbox.stub().resolves()
            };

            goodTestSensor= {
                'Entity Id': 'test',
                Status: 'ok',
                'Sensor Id': 'good sensor'
            };

            badTestSensor= {
                'Entity Id': 'test',
                Status: 'nr',
                'Sensor Id': 'bad sensor'
            };

            data = {
                host: 'host',
                user: 'user',
                password: 'pass',
                workItemId: '54d6cdff8db79442ddf33333',
                node: '560022c2c5ac58132c5d3cc5',
                sdr: samples
            };
        });

        afterEach(function() {
            this.sandbox.restore();
        });


        it("should not alert on empty sdr data", function() {
            return this.determineAlert(null).should.become(undefined);
        });

        it("should alert and update the db when a Status becomes not okay", function() {
            var workitem = {
                config: {
                    command: 'sdr'
                }
            };
            waterline.workitems.find.resolves(workitem);

            var conf = {
                command: 'sdr',
                inCondition: {
                    'bad sensor': true
                }
            };

            data.sdr = samples.concat(badTestSensor);

            return this.determineAlert(data)
            .then(function(out) {
                expect(out).to.have.length(1);
                expect(out[0]).to.have.property('reading').that.equals(badTestSensor);
                expect(out[0]).to.have.property('host').that.equals(data.host);
                expect(out[0]).to.have.property('node').that.equals(data.node);
                expect(waterline.workitems.update).to.have.been
                    .calledWith({ id: data.workItemId }, { config: conf });
            });
        });

        it("should alert and update the db when a Status becomes okay", function() {
            var workitem = {
                config: {
                    command: 'sdr',
                    inCondition: {
                        'good sensor': true
                    }
                }
            };
            waterline.workitems.find.resolves(workitem);

            var conf = {
                command: 'sdr',
                inCondition: {
                    'good sensor': false
                }
            };

            data.sdr = samples.concat(goodTestSensor);

            return this.determineAlert(data)
            .then(function(out) {
                expect(out).to.have.length(1);
                expect(out[0]).to.have.property('reading').that.equals(goodTestSensor);
                expect(out[0]).to.have.property('host').that.equals(data.host);
                expect(out[0]).to.have.property('node').that.equals(data.node);
                expect(waterline.workitems.update).to.have.been
                    .calledWith({ id: data.workItemId }, { config: conf });
            });
        });

        it("should not alert if state has not changed", function() {
            var workitem = {
                config: {
                    command: 'sdr',
                    inCondition: {
                        'bad sensor': true,
                        'good sensor': false
                    }
                }
            };
            waterline.workitems.find.resolves(workitem);


             data.sdr = samples.concat(goodTestSensor).concat(badTestSensor);

            return this.determineAlert(data).should.become(null);
        });
    });
});
