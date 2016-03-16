// Copyright 2016, EMC, Inc.
/* jshint node:true */

'use strict';

var uuid = require('node-uuid'),
    events = require('events'),
    waterline = {},
    sandbox = sinon.sandbox.create(),
    redfishJob,
    redfishTool = {
        clientRequest: sandbox.stub()
    },
    listChassisData = { 
        body: {
            Members: [
                {'@odata.id':'/redfish/v1/Chassis/abc123'}
            ],
            Power: {},
            Thermal: {},
            LogServices: {}
        }
    },
    chassisData = { body: { chassis: 'data' } },
    logData = { body: { Entries: {}, Items: [{ entry: 'data' }] } },
    data = {
        config: { command: 'power' },
        uri: 'http://testuri',
        user: 'user',
        password: 'password',
        workItemId: 'testworkitemid',
        node: 'xyz'
    };

describe('Job.Redfish', function () {
    var base = require('./base-spec');

    base.before(function (context) {
        helper.setupInjector([
            helper.require('/spec/mocks/logger.js'),
            helper.requireGlob('/lib/services/*.js'),
            helper.require('/lib/jobs/base-job.js'),
            helper.require('/lib/jobs/redfish-job.js'),
            helper.require('/lib/utils/job-utils/redfish-tool.js'),
            helper.di.simpleWrapper(waterline,'Services.Waterline')
        ]);
        context.Jobclass = helper.injector.get('Job.Redfish');
    });

    describe('Base', function () {
        base.examples();
    });

    describe("redfish-job", function() {
        var testEmitter = new events.EventEmitter();
        
        beforeEach(function() {
            waterline.workitems = {
                update: sandbox.stub().resolves(),
                findOne: sandbox.stub().resolves(),
                setSucceeded: sandbox.stub().resolves()
            };
            waterline.nodes = {
                needByIdentifier: sinon.stub().resolves({
                    obmSettings: [{
                        service: 'redfish-obm-service',
                        config: {}
                    }]
                })
            };
            
            var graphId = uuid.v4();
            redfishJob = new this.Jobclass({}, { graphId: graphId }, uuid.v4());
            expect(redfishJob.routingKey).to.equal(graphId);
            redfishJob.initClient = sandbox.stub().returns(redfishTool);
        });
        
        afterEach(function() {
            redfishJob.initClient.reset();
            redfishTool.clientRequest.reset();
        });
        
        it("should have a _run() method", function() {
            expect(redfishJob).to.have.property('_run').with.length(0);
        });

        it("should have a subscribe redfish command method", function() {
            expect(redfishJob).to.have.property('_subscribeRedfishCommand').with.length(2);
        });

        it("should initialize client", function() {
            var job = new this.Jobclass({}, { graphId: uuid.v4() }, uuid.v4());
            return expect(job.initClient({config:'data'}))
                .to.have.property('settings');
        });

        it("should listen for redfish command requests", function(done) {
            redfishJob.collectData = sinon.stub().resolves(chassisData.body);
            redfishJob._publishRedfishCommandResult = sinon.stub();
            redfishJob._subscribeRedfishCommand = function(routingKey, callback) {
                testEmitter.on('test-subscribe-redfish-command', function(data) {
                    callback.call(redfishJob, data);
                });
            };

            redfishJob._run()
            .then(function() {
                testEmitter.emit('test-subscribe-redfish-command', data);
                setImmediate(function() {
                    try {
                        expect(redfishJob.collectData).to.be.calledOnce;
                        done();
                    } catch (e) {
                        done(e);
                    }
                });
            });
        });
        
        it("should run collectData for each Chassis command", function() {
            _.forEach(['power', 'thermal'], function(command) {
                redfishTool.clientRequest.reset();
                redfishTool.clientRequest.onCall(0).resolves(listChassisData);
                redfishTool.clientRequest.onCall(1).resolves(chassisData);
                redfishTool.clientRequest.onCall(2).resolves(chassisData);
                return redfishJob.collectData(data, command)
                .then(function(data) {
                    expect(data).to.equal(chassisData.body);
                });
            });
        });
        
        it("should run collectData for LogServies", function() {
            redfishTool.clientRequest.onCall(0).resolves(listChassisData);
            redfishTool.clientRequest.onCall(1).resolves(listChassisData);
            redfishTool.clientRequest.onCall(2).resolves(logData);
            redfishTool.clientRequest.onCall(3).resolves(logData);
            return redfishJob.collectData(data, 'logservices')
            .then(function(data) {
                expect(data).to.deep.equal(logData.body.Items);
            });
        });
        
        it("should fail collactData for unknown command", function() {
            redfishTool.clientRequest.onCall(0).resolves(listChassisData);
            redfishTool.clientRequest.onCall(1).resolves(chassisData);
            return expect(redfishJob.collectData(data, 'unknown'))
                .to.be.rejectedWith('Unsupported Redfish Command: unknown');
        });
        
        it("should fail collectChassis with no data", function() {
            redfishTool.clientRequest.onCall(0).resolves(listChassisData);
            redfishTool.clientRequest.onCall(1).resolves({body: undefined});
            return expect(redfishJob.collectData(data, 'power'))
                .to.be.rejectedWith('No Data Found For Command: power');
        });
        
        it("should fail getPowerAsync with error", function() {
            redfishTool.clientRequest.onCall(0).resolves(listChassisData);
            redfishTool.clientRequest.onCall(1).rejects('error text');
            return expect(redfishJob.collectData(data, 'power'))
                .to.be.rejectedWith('error text');
        });
        
        it("should add a concurrent request", function() {
            expect(redfishJob.concurrentRequests('test', 'power')).to.equal(false);
            redfishJob.addConcurrentRequest('test', 'power');
            expect(redfishJob.concurrent).to.have.property('test')
                .with.property('power').that.equals(1);
        });

        it("should return true if there are requests outstanding", function() {
            expect(redfishJob.concurrentRequests('test', 'power')).to.equal(false);
            _.forEach(_.range(redfishJob.maxConcurrent), function() {
                redfishJob.addConcurrentRequest('test', 'power');
            });
            expect(redfishJob.concurrentRequests('test', 'power')).to.equal(true);
        });
    });
});
