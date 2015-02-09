// Copyright 2015, Renasar Technologies Inc.
/* jshint node:true */

'use strict';

var uuid = require('node-uuid');

describe(require('path').basename(__filename), function () {
    var injector;
    var base = require('./base-spec');

    var selData = "1,10/26/2014,20:17:30,Event Logging Disabled #0x07,Log area reset/cleared,Asserted\n" +  // jshint ignore:line
                  "2,10/26/2014,20:17:47,Power Supply #0x51,Power Supply AC lost,Asserted\n" +  // jshint ignore:line
                  "3,10/26/2014,20:17:48,Power Unit #0x02,Fully Redundant,Deasserted\n" +
                  "4,10/26/2014,20:17:48,Power Unit #0x02,Redundancy Lost,Asserted\n" +
                  "5,10/26/2014,20:17:48,Power Unit #0x02,Non-Redundant: Sufficient from Redundant,Asserted\n" +  // jshint ignore:line
                  "6,10/26/2014,20:17:51,Power Supply #0x51,Presence detected,Deasserted\n";  // jshint ignore:line

    base.before(function (context) {
        var _ = helper.baseInjector.get('_');
        // create a child injector with renasar-core and the base pieces we need to test this
        injector = helper.baseInjector.createChild(_.flatten([
            helper.require('/spec/mocks/logger.js'),
            helper.requireGlob('/lib/services/*.js'),
            helper.require('/lib/utils/job-utils/ipmi-parser.js'),
            helper.require('/lib/jobs/base-job.js'),
            helper.require('/lib/jobs/base-job.js'),
            helper.require('/lib/jobs/ipmi-sel-alert-job.js'),
            helper.require('/lib/jobs/poller-alert-job.js')
        ]));

        context.parser = injector.get('JobUtils.IpmiCommandParser');
        context.Jobclass = injector.get('Job.Poller.Alert.Ipmi.Sel');
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
                        "sensor": "Power Unit #0x02",
                        "event": "Fully Redundant"
                    }
                ]
            };
            return this.determineAlert(data).then(function(out) {
                expect(out).to.have.property('alerts').with.length(1);
                expect(out.alerts[0]).to.have.property('data');
                expect(out.alerts[0].data).to.deep.equal({
                   date: '10/26/2014',
                   time: '20:17:48',
                   sensor: 'Power Unit #0x02',
                   event: 'Fully Redundant',
                   value: 'Deasserted'
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
                        "sensor": "/Power Unit.*/",
                        "event": "/\\w*/"  // jshint ignore:line
                    }
                ]
            };
            return this.determineAlert(data).then(function(out) {
                expect(out).to.have.property('alerts').with.length(3);
            });
        });
    });
});
