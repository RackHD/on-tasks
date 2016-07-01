// Copyright 2015, EMC, Inc.
/* jshint node:true */

'use strict';

var uuid = require('node-uuid'),
    events = require('events'),
    waterline = {},
    protocolEvents;

describe(require('path').basename(__filename), function () {
    var base = require('./base-spec');

    base.before(function (context) {
        // create a child injector with on-core and the base pieces we need to test this
        helper.setupInjector([
            helper.require('/spec/mocks/logger.js'),
            helper.requireGlob('/lib/services/*.js'),
            helper.require('/lib/utils/job-utils/ipmitool.js'),
            helper.require('/lib/utils/job-utils/ipmi-parser.js'),
            helper.require('/lib/jobs/base-job.js'),
            helper.require('/lib/jobs/ipmi-job.js'),
            helper.di.simpleWrapper(waterline,'Services.Waterline')
        ]);

        context.Jobclass = helper.injector.get('Job.Ipmi');
        protocolEvents = helper.injector.get('Protocol.Events');
    });

    describe('Base', function () {
        base.examples();
    });

    describe("ipmi-job", function() {
        var testEmitter = new events.EventEmitter();
        var config, workitem;
        beforeEach(function() {
            this.sandbox = sinon.sandbox.create();
            waterline.workitems = {
                update: this.sandbox.stub().resolves(),
                findOne: this.sandbox.stub().resolves(),
                setSucceeded: this.sandbox.stub().resolves(),
                setFailed: this.sandbox.stub().resolves()
            };
            var graphId = uuid.v4();
            config = {
                host: '10.1.1.',
                user: 'admin',
                password: 'admin',
                workItemId: 'testworkitemid'
            };
            workitem= {
                failureCount: 1,
                node: "any",
                lastFinished: null,
                leaseToken: null,
                leaseExpires: null
            };
            this.ipmi = new this.Jobclass({}, { graphId: graphId }, uuid.v4());
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
            self.ipmi.collectIpmiSdr = sinon.stub().resolves();
            self.ipmi._publishIpmiCommandResult = sinon.stub();
            waterline.workitems.findOne = sinon.stub.resolves(workitem);
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

        it("should publish node accessible alerts", function() {
            var self = this;
            self.ipmi.addConcurrentRequest = sinon.stub().returns();
            self.ipmi.concurrentRequests = sinon.stub().returns(false);
            self.ipmi.collectIpmiSdr = sinon.stub().resolves('any');
            self.ipmi.removeConcurrentRequest = sinon.stub().resolves();
            self.ipmi._publishIpmiCommandResult = sinon.stub().resolves();
            waterline.workitems.findOne = sinon.stub().resolves(workitem);
            waterline.workitems.setSucceeded = sinon.stub().resolves();
            protocolEvents.publishNodeAlert = sinon.stub().resolves();
            return self.ipmi.createCallback("sdr", self.ipmi.collectIpmiSdr)(config)
                .then(function(){

                    expect(protocolEvents.publishNodeAlert)
                        .to.be.calledWith(workitem.node, {nodeId: workitem.node,
                            obmType: "ipmi-obm-service",
                            state: "accessible",
                            command: "sdr"});
                });
        });

        it("should publish node inaccessible alerts", function() {
            var self = this;
            self.ipmi.addConcurrentRequest = sinon.stub().returns();
            self.ipmi.concurrentRequests = sinon.stub().returns(false);
            self.ipmi.collectIpmiSdr = sinon.stub().resolves('any');
            self.ipmi.removeConcurrentRequest = sinon.stub().resolves();
            self.ipmi._publishIpmiCommandResult = sinon.stub().rejects();
            waterline.workitems.findOne = sinon.stub().resolves(workitem);
            waterline.workitems.setFailed = sinon.stub().resolves();
            protocolEvents.publishNodeAlert = sinon.stub().resolves();
            return self.ipmi.createCallback("sdr", self.ipmi.collectIpmiSdr)(config)
                .then(function(){
                    expect(protocolEvents.publishNodeAlert)
                        .to.be.calledWith(workitem.node, {nodeId: workitem.node,
                            obmType: "ipmi-obm-service",
                            state: "inaccessible",
                            command: "sdr"});
                    expect(self.ipmi.collectIpmiSdr).to.be.calledOnce;
                    expect(config).not.to.have.property("password");
                });
        });

        it("should not publish node inaccessible alerts", function() {
            var self = this;
            workitem.failureCount = 2;
            self.ipmi.addConcurrentRequest = sinon.stub().returns();
            self.ipmi.concurrentRequests = sinon.stub().returns(false);
            self.ipmi.collectIpmiSdr = sinon.stub().resolves('any');
            self.ipmi.removeConcurrentRequest = sinon.stub().resolves();
            self.ipmi._publishIpmiCommandResult = sinon.stub().rejects();
            waterline.workitems.findOne = sinon.stub().resolves(workitem);
            waterline.workitems.setFailed = sinon.stub().resolves();
            protocolEvents.publishNodeAlert = sinon.stub().resolves();
            return self.ipmi.createCallback("sdr", self.ipmi.collectIpmiSdr)(config)
                .then(function(){
                    expect(protocolEvents.publishNodeAlert).callCount(0);
                    expect(waterline.workitems.setFailed).to.be.calledOnce;
                });
        });
    });
});
