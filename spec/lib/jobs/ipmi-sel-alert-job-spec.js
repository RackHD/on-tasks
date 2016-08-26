// Copyright 2015, EMC, Inc.
/* jshint node:true */

'use strict';

var uuid = require('node-uuid');

describe(require('path').basename(__filename), function () {
    var base = require('./base-spec');

    var selData = "1,10/26/2014,20:17:30,Event Logging Disabled #0x07,Log area reset/cleared,Asserted\n" +  // jshint ignore:line
                  "2,10/26/2014,20:17:47,Power Supply #0x51,Power Supply AC lost,Asserted\n" +  // jshint ignore:line
                  "3,10/26/2014,20:17:48,Power Unit #0x02,Fully Redundant,Deasserted\n" +
                  "4,10/26/2014,20:17:48,Power Unit #0x02,Redundancy Lost,Asserted\n" +
                  "5,10/26/2014,20:17:48,Power Unit #0x02,Non-Redundant: Sufficient from Redundant,Asserted\n" +  // jshint ignore:line
                  "6,10/26/2014,20:17:51,Power Supply #0x51,Presence detected,Deasserted\n";  // jshint ignore:line

    var selDataAlt = "SEL Entry: 010002C5C157542000042AFF6FF2FFFF\n" +
                     "0x0001,11/03/2014,09:56:21,Session Audit #0xFF,,Asserted\n" +
                     "SEL Entry: 020002C5C157542000042AFF6FF2FFFF\n" +
                     "0x0002,11/03/2014,09:56:21,Session Audit #0xFF,,Asserted\n" +
                     "SEL Entry: 030002CCC157542000042AFF6FF2FFFF\n" +
                     "0x0003,11/03/2014,09:56:28,Session Audit #0xFF,,Asserted\n" +
                     "SEL Entry: 040002CDC157542000042AFF6FF2FFFF\n" +
                     "0x0004,11/03/2014,09:56:29,Session Audit #0xFF,,Asserted\n" +
                     "SEL Entry: 050002DAC157542000042AFF6FF2FFFF\n" +
                     "0x0005,11/03/2014,09:56:42,Session Audit #0xFF,,Asserted\n" +
                     "SEL Entry: 060002DAC157542000042AFF6FF2FFFF\n" +
                     "0x0006,11/03/2014,09:56:42,Session Audit #0xFF,,Asserted\n" +
                     "SEL Entry: 070002644075542000042AFF6FF2FFFF\n" +
                     "0x0007,11/25/2014,18:52:20,Session Audit #0xFF,,Asserted\n" +
                     "SEL Entry: 080002C9ED7C542000042AFF6FF2FFFF\n" +
                     "0x0008,12/01/2014,14:38:01,Session Audit #0xFF,,Asserted\n" +
                     "SEL Entry: 090002D3ED7C542000042AFF6FF2FFFF\n" +
                     "0x0009,12/01/2014,14:38:11,Session Audit #0xFF,,Asserted\n" +
                     "SEL Entry: 0A0002E7ED7C542000042AFF6FF2FFFF\n" +
                     "0x000A,12/01/2014,14:38:31,Session Audit #0xFF,,Asserted\n";

    base.before(function (context) {
        // create a child injector with on-core and the base pieces we need to test this
        helper.setupInjector([
            helper.require('/spec/mocks/logger.js'),
            helper.requireGlob('/lib/services/*.js'),
            helper.require('/lib/utils/job-utils/ipmi-parser.js'),
            helper.require('/lib/jobs/base-job.js'),
            helper.require('/lib/jobs/ipmi-sel-alert-job.js'),
            helper.require('/lib/jobs/poller-alert-job.js')
        ]);

        context.parser = helper.injector.get('JobUtils.IpmiCommandParser');
        context.Jobclass = helper.injector.get('Job.Poller.Alert.Ipmi.Sel');
        var alertJob = new context.Jobclass({}, { graphId: uuid.v4() }, uuid.v4());
        context.determineAlert = alertJob._determineAlert;
    });

    describe('Base', function () {
        base.examples();
    });

    describe("ipmi-sel-alert-job", function() {
        it("should not alert on empty sel data", function() {
            return this.determineAlert(null).should.become(undefined);
        });

        it("should alert on sel data", function() {
            var parsed = this.parser.parseSelData(selData);
            var data = {
                sel: parsed,
                alerts: [
                    {
                        "sensorType": "Power Unit",
                        "sensorNumber": "#0x02",
                        "event": "Fully Redundant"
                    }
                ]
            };
            return this.determineAlert(data).then(function(out) {
                expect(out).to.have.property('alerts').with.length(1);
                expect(out.alerts[0]).to.have.property('data');
                expect(out.alerts[0].data).to.deep.equal({
                    logId: '3',
                    date: '10/26/2014',
                    time: '20:17:48',
                    sensorType: "Power Unit",
                    sensorNumber: "#0x02",
                    event: 'Fully Redundant',
                    value: 'Deasserted'
                });
                expect(out.alerts[0]).to.have.property('matches');
                expect(out.alerts[0].matches).to.deep.equal(data.alerts);
            });
        });

        it("should alert on alternative sel data", function() {
            var parsed = this.parser.parseSelData(selDataAlt);
            var data = {
                sel: parsed,
                alerts: [
                    {
                        "time": "14:38:31",
                        "sensorType": "Session Audit",
                        "sensorNumber": "#0xFF",
                        "value": "Asserted"
                    }
                ]
            };
            return this.determineAlert(data).then(function(out) {
                expect(out).to.have.property('alerts').with.length(1);
                expect(out.alerts[0]).to.have.property('data');
                expect(out.alerts[0].data).to.deep.equal({
                    logId: '0x000A',
                    date: '12/01/2014',
                    time: '14:38:31',
                    sensorType: "Session Audit",
                    sensorNumber: "#0xFF",
                    event: '',
                    value: 'Asserted'
                });
                expect(out.alerts[0]).to.have.property('matches');
                expect(out.alerts[0].matches).to.deep.equal(data.alerts);
            });
        });

        it("should alert on sel data with regexes", function() {
            var parsed = this.parser.parseSelData(selData);
            var data = {
                sel: parsed,
                alerts: [
                    {
                        "sensorType": "/Power.*/",
                        "sensorNumber": "/.*/",
                        "event": "/\\w*/"  // jshint ignore:line
                    }
                ]
            };
            return this.determineAlert(data).then(function(out) {
                expect(out).to.have.property('alerts').with.length(5);
            });
        });

        it("should only alert if the most recent values for a sensor+event match", function() {
            var _selData = _.cloneDeep(selData);
            _selData += "7,10/26/2014,20:17:55,Power Supply #0x51,Fully Redundant,Deasserted\n";
            _selData += "8,10/26/2014,20:17:59,Power Supply #0x51,Fully Redundant,Asserted\n";
            var parsed = this.parser.parseSelData(_selData);
            var data = {
                sel: parsed,
                alerts: [
                    {
                        "sensor": "Power Supply #0x51",
                        "event": "Fully Redundant",
                        "value": "Deasserted"
                    }
                ]
            };
            return this.determineAlert(data).then(function(out) {
                expect(out).to.be.empty;
            });
        });
    });
});
