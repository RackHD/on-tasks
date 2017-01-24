// Copyright 2015, EMC, Inc.
/* jshint node:true */

'use strict';

var uuid = require('node-uuid');
var waterline = {};
var env;

describe(require('path').basename(__filename), function () {
    var base = require('./base-spec');

    var selData =   "SEL Record ID         : 0001\n"+
                    "Record Type           : 02\n"+
                    "Timestamp             : 01/01/1970 00:00:29\n"+
                    "Generator ID          : 0000\n"+
                    "EvM Revision          : 04\n"+
                    "Sensor Type           : Power Unit\n"+
                    "Sensor Number         : 01\n"+
                    "Event Type            : Sensor-specific Discrete\n"+
                    "Event Direction       : Deassertion Event\n"+
                    "Event Data            : 00ffff\n"+
                    "Description           : Power off/down\n";
        var parser, alertJob;


    base.before(function (context) {
        // create a child injector with on-core and the base pieces we need to test this
        helper.setupInjector([
            helper.require('/spec/mocks/logger.js'),
            helper.requireGlob('/lib/services/*.js'),
            helper.require('/lib/utils/job-utils/ipmi-parser.js'),
            helper.require('/lib/jobs/base-job.js'),
            helper.require('/lib/jobs/ipmi-sel-alert-job.js'),
            helper.require('/lib/jobs/poller-alert-job.js'),
            helper.di.simpleWrapper(waterline, 'Services.Waterline')
        ]);


        parser = helper.injector.get('JobUtils.IpmiCommandParser');
        context.Jobclass = helper.injector.get('Job.Poller.Alert.Ipmi.Sel');
        alertJob = new context.Jobclass({}, { graphId: uuid.v4() }, uuid.v4());
        env = helper.injector.get('Services.Environment');
        waterline.nodes = {
            findOne: sinon.stub().resolves()
        };
    });

    beforeEach(function () {
        this.sandbox = sinon.sandbox.create();
        waterline.nodes.findOne.reset();
        this.sandbox.stub(env, 'get');
    });

    afterEach(function() {
        this.sandbox.restore();
    });

    describe('Base', function () {
        base.examples();
    });

    describe("ipmi-sel-alert-job", function() {
        it("should not alert on empty sel data", function() {
            return alertJob._determineAlert(null).should.become(undefined);
        });

        it("should alert on sel data", function() {
            var parsed = parser.parseSelDataEntries(selData);
            var data = {
                node : "123",
                selEntries: parsed
            };
            var alerts = {alerts: [{"Generator ID" : "0000" }]};
            env.get.resolves(alerts);

            waterline.nodes.findOne.resolves({"id" :"123","sku":"sku123"});
            return alertJob._determineAlert(data).then(function(out) {
                expect(out[1]).with.length(1);
                expect(out[1][0]).to.have.property('data');
                expect(out[1][0].data).to.have.property('alert');
                expect(out[1][0].data.alert).to.have.property('reading');
                expect(out[1][0].data.alert.reading).to.deep.equal(
                    {
                        "SEL Record ID": "0001",
                        "Record Type": "02",
                        "Timestamp": "01/01/1970 00:00:29",
                        "Generator ID": "0000",
                        "EvM Revision": "04",
                        "Sensor Type": "Power Unit",
                        "Sensor Number": "01",
                        "Event Type": "Sensor-specific Discrete",
                        "Event Direction": "Deassertion Event",
                        "Event Data": "00ffff",
                        "Description": "Power off/down"
                    }
                );
                expect(out[1][0].data.alert).to.have.property('matches');
                expect(out[1][0].data.alert.matches).to.deep.equal(alerts.alerts);
            });
        });

        it("should alert on sel data with regexes", function() {
            var parsed = parser.parseSelDataEntries(selData);
            var data = {
                selEntries: parsed,
                node : "123"
            };
            var alerts = {alerts: [
                {
                    "Sensor Type": "/Power.*/",
                    //"sensorType": "/.*/",
                    "Sensor Number": "/.*/",
                    "Event Type": "/\\w*/"  // jshint ignore:line
                }
            ]};
            env.get.resolves(alerts);
            waterline.nodes.findOne.resolves({"id" :"123","sku":"sku123"});
            return alertJob._determineAlert(data).then(function(out) {
                expect(out[1]).with.length(1);
            });
        });

        it("should only alert if the most recent values for a sensor+event match", function() {
            var _selData = _.cloneDeep(selData);
            _selData += "7,10/26/2014,20:17:55,Power Supply #0x51,Fully Redundant,Deasserted\n";
            _selData += "8,10/26/2014,20:17:59,Power Supply #0x51,Fully Redundant,Asserted\n";
            var parsed = parser.parseSelData(_selData);
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
            return alertJob._determineAlert(data).then(function(out) {
                expect(out).to.be.empty;
            });
        });
    });

    describe("format event", function() {
        it("should throw error if input is not an array", function() {
            expect(function(){ alertJob._formatSelAlert({}); })
                .to.throw(Error.AssertionError, 'alerts (array) is required');
        });
    });
});
