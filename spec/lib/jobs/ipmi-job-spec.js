// Copyright 2015, EMC, Inc.
/* jshint node:true */

'use strict';

var uuid = require('node-uuid'),
    events = require('events'),
    waterline = {},
    temp = require('temp').track(),
    fs;

describe(require('path').basename(__filename), function () {
    var base = require('./base-spec');
    var pollerHelper;

    base.before(function (context) {
        // create a child injector with on-core and the base pieces we need to test this
        helper.setupInjector([
            helper.require('/spec/mocks/logger.js'),
            helper.requireGlob('/lib/services/*.js'),
            helper.require('/lib/utils/job-utils/ipmitool.js'),
            helper.require('/lib/utils/job-utils/ipmi-parser.js'),
            helper.require('/lib/jobs/base-job.js'),
            helper.require('/lib/jobs/ipmi-job.js'),
            helper.require('/lib/utils/job-utils/poller-helper.js'),
            helper.di.simpleWrapper(waterline,'Services.Waterline'),
            helper.di.simpleWrapper(temp,'temp')
        ]);
        context.Jobclass = helper.injector.get('Job.Ipmi');
        pollerHelper = helper.injector.get('JobUtils.PollerHelper');
    });
    before(function () {
        fs = helper.injector.get('fs');
        sinon.stub(fs, 'readFile');
    });

    beforeEach(function() {
        fs.readFile.reset();
    });

    after(function () {
        fs.readFile.restore();
    });
    describe('Base', function () {
        base.examples();
    });

    describe("ipmi-job", function() {
        var testEmitter = new events.EventEmitter();
        beforeEach(function() {
            this.sandbox = sinon.sandbox.create();
            waterline.workitems = {
                update: this.sandbox.stub().resolves(),
                findOne: this.sandbox.stub().resolves({node: "any"}),
                setSucceeded: this.sandbox.stub().resolves(),
                setFailed: this.sandbox.stub().resolves()
            };
            var graphId = uuid.v4();
            this.ipmi = new this.Jobclass({}, { graphId: graphId }, uuid.v4());
            this.ipmi._publishPollerAlert = this.sandbox.stub().resolves();
            this.ipmi.selInformation = this.sandbox.stub().resolves();
            expect(this.ipmi.routingKey).to.equal(graphId);
        });

        it("should have a _run() method", function() {
            expect(this.ipmi).to.have.property('_run').with.length(0);
        });

        it("should have a sdr command subscribe method", function() {
            expect(this.ipmi).to.have.property('_subscribeRunIpmiCommand').with.length(3);
        });

        it("should listen for ipmi sdr command requests", function(done) {
            var self = this;
            var config = {
                host: '10.1.1.',
                user: 'admin',
                password: 'admin',
                workItemId: 'testworkitemid'
            };
            self.ipmi.collectIpmiSdr = sinon.stub().resolves();
            pollerHelper.getNodeAlertMsg = sinon.stub().resolves({});
            self.ipmi._publishIpmiCommandResult = sinon.stub();
            self.ipmi._subscribeRunIpmiCommand = function(routingKey, type, callback) {
                if (type === 'sdr') {
                    testEmitter.on('test-subscribe-ipmi-sdr-command', function(config) {
                        // BaseJob normally binds this callback to its subclass instance,
                        // so do the equivalent
                        callback.call(self.ipmi, config);
                    });
                }
            };

            self.ipmi._run()
                .then(function() {
                    _.forEach(_.range(100), function(i) {
                        var _config = _.cloneDeep(config);
                        _config.host += i;
                        testEmitter.emit('test-subscribe-ipmi-sdr-command', _config);
                    });

                    setImmediate(function() {
                        try {
                            expect(self.ipmi.collectIpmiSdr.callCount).to.equal(100);
                            expect(pollerHelper.getNodeAlertMsg.callCount).to.equal(100);
                            done();
                        } catch (e) {
                            done(e);
                        }
                    });
                });
        });

        it("should add a concurrent request", function() {
            expect(this.ipmi.concurrentRequests('test', 'chassis')).to.equal(false);
            this.ipmi.addConcurrentRequest('test', 'chassis');
            expect(this.ipmi.concurrent).to.have.property('test')
                .with.property('chassis').that.equals(1);
        });

        it("should return true if there are requests outstanding", function() {
            expect(this.ipmi.concurrentRequests('test', 'chassis')).to.equal(false);
            this.ipmi.addConcurrentRequest('test', 'chassis');
            expect(this.ipmi.concurrentRequests('test', 'chassis')).to.equal(true);
        });

        it("should send power state alert", function() {
            var self = this;
            var testState = {power:'ON'};
            var testData = {workItemId: 'abc'};
            self.ipmi.cachedPowerState[testData.workItemId] = 'OFF';
            return self.ipmi.powerStateAlerter(testState, testData)
                .then(function(status) {
                    expect(status).to.deep.equal(testState);
                    expect(self.ipmi.cachedPowerState[testData.workItemId]).to.equal(status.power);
                });
        });
        it("should send sel data", function() {
            var self = this;
            var data = {
                "host": "172.31.128.188",
                "password": "admin",
                "user": "admin",
                "node": "57b5f7dc293c94e846c5a44f",
                "lastReportedSelEntryID": 1,
                "lastUpdatedSelDate": "1970-01-01T00:00:29.000Z",
                "workItemId": "57b5f82ae127bf154795114f"
            };

            var selInfo = {
                "Version": "1.5 (v1.5, v2 compliant)",
                "Entries": "1",
                "Free Space": "15984 bytes",
                "Percent Used": "0%",
                "Last Add Time": "01/01/1970 00:00:29",
                "Last Del Time": "Not Available",
                "Overflow": "false",
                "Supported Cmds": "'Delete' 'Reserve'"
            };

            var workObj = {
                "node": "57b5f7dc293c94e846c5a44f",
                "config": {
                    "command": "sel",
                    "lastReportedSelEntryID": 1,
                    "lastUpdatedSelDate": "1970-01-01T00:00:29.000Z"
                },
                "createdAt": "2016-08-18T18:02:18.413Z",
                "failureCount": 1,
                "lastFinished": "2016-08-21T20:13:57.012Z",
                "lastStarted": "2016-08-21T20:13:58.995Z",
                "leaseExpires": "2016-08-21T20:14:13.995Z",
                "leaseToken": "5956c3b9-3cbb-450d-823b-646665b6034a",
                "name": "Pollers.IPMI",
                "nextScheduled": "2016-08-21T20:13:58.012Z",
                "paused": false,
                "pollInterval": 500,
                "state": "accessible",
                "updatedAt": "2016-08-21T20:13:58.995Z",
                "id": "57b5f82ae127bf154795114f",
                save: this.sandbox.stub().resolves()
            };

            var selUnparsedSelData =   "SEL Record ID          : 0001\n"+
                "Record Type           : 02 \n"+
                "Timestamp             : 01/01/1970 00:00:29\n"+
                "Generator ID          : 0000\n"+
                "EvM Revision          : 04\n"+
                "Sensor Type           : Power Unit\n"+
                "Sensor Number         : 01\n"+
                "Event Type            : Sensor-specific Discrete\n"+
                "Event Direction       : Deassertion Event\n"+
                "Event Data            : 00ffff\n"+
                "Description           : Power off/down\n";

            var rawSelData = " ff ff 01 00 02 2a 00 00 00 00 00 04 09 01 ef 00\n ff ff\n";

            var sel = [
                {
                    "Event Type Code": "6f",
                    "Sensor Type Code": "09",
                    "SEL Record ID": "0001",
                    "Record Type": "02",
                    "Timestamp": "01/01/1970 00:00:29",
                    "Generator ID": "0000",
                    "EvM Revision": "04",
                    "Sensor Type": "Power Unit",
                    "Sensor Number": "01",
                    "Event Type": "Sensor-specific Discrete",
                    "Event Direction": "Deassertion Event",
                    "Event Data": "00ffff"
                }
            ];
            var verboseFile= "<<OPEN SESSION RESPONSE\n"+
                "<<  Message tag                        : 0x00\n"+
                "<<  RMCP+ status                       : no errors\n"+
                "<<  Maximum privilege level            : Unknown (0x00)\n"+
                "<<  Console Session ID                 : 0xa0a2a3a4\n"+

                "<<RAKP 2 MESSAGE\n"+
                "<<  Message tag                   : 0x00\n"+
                "<<  RMCP+ status                  : no errorsf\n"+

                "<<RAKP 4 MESSAGE\n"+
                "<<  Message tag                   : 0x00\n"+

                "SEL Record ID          : 0467\n"+
                "Record Type           : 02\n"+
                "Timestamp             : 01/01/1970 21:33:30\n"+
                "Generator ID          : 0000\n"+
                "EvM Revision          : 04\n"+
                "Sensor Type           : Event Logging Disabled\n"+
                "Sensor Number         : 07\n"+
                "Event Type            : Sensor-specific Discrete\n"+
                "Event Direction       : Assertion Event\n"+
                "Event Data            : 02ffff\n"+
                "Description           : Log area reset/cleared\n";
            var hexBuffer= Buffer[16];
            hexBuffer =  [103,4,2,42,7,1,0,0,0,4,16,7,111,2,255,255];

            waterline.workitems.findOne.resolves(workObj);
            self.ipmi.collectIpmiSelInformation = this.sandbox.stub().resolves(selInfo);
            waterline.workitems.findOne.resolves(workObj);
            self.ipmi.getSelEntries = this.sandbox.stub().resolves(selUnparsedSelData);
            self.ipmi.genericCommand = this.sandbox.stub().resolves(verboseFile);
            fs.readFile.callsArgWith(1, null, hexBuffer);
            self.ipmi.collectIpmiSelEntries(data)
                .then(function(selData){
                    expect(selData["Event Data"]).to.deep.equal(sel["Event Data"]);
                    expect(selData["Sensor Type Code"]).to.deep.equal(sel["Sensor Type Code"]);
                    expect(selData["Event Type Code"]).to.deep.equal(sel["Event Type Code"]);
                });
        });




    });
});
