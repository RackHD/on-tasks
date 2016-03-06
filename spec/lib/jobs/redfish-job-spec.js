// Copyright 2016, EMC, Inc.
/* jshint node:true */

'use strict';

var uuid = require('node-uuid'),
    events = require('events'),
    waterline = {},
    redfishApi,
    sandbox = sinon.sandbox.create(),
    redfishJob,
    listChassisData = [
        null,
        { 
            body: {
                Members: [
                    {'@odata.id':'/redfish/v1/Chassis/abc123'}
                ]
            }
        }
    ],
    chassisData = [
        null,
        { body : { chassis: 'data'} }
    ];

describe('Job.Redfish', function () {
    var base = require('./base-spec');

    base.before(function (context) {
        helper.setupInjector([
            helper.require('/spec/mocks/logger.js'),
            helper.requireGlob('/lib/services/*.js'),
            helper.require('/lib/jobs/base-job.js'),
            helper.require('/lib/jobs/redfish-job.js'),
            helper.di.simpleWrapper(waterline,'Services.Waterline')
        ]);

        context.Jobclass = helper.injector.get('Job.Redfish');
        var redfish = require('redfish-node'); 
        redfishApi = Promise.promisifyAll(new redfish.RedfishvApi());
        redfishApi.listChassisAsync = sandbox.stub().resolves();
        redfishApi.getPowerAsync = sandbox.stub().resolves();
        redfishApi.getThermalAsync = sandbox.stub().resolves();
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
        });
        
        it("should have a _run() method", function() {
            expect(redfishJob).to.have.property('_run').with.length(0);
        });

        it("should have a subscribe redfish command method", function() {
            expect(redfishJob).to.have.property('_subscribeRedfishCommand').with.length(2);
        });

        it("should listen for redfish command requests", function(done) {
            var data = {
                config: { command: 'power' },
                uri: 'http://testuri',
                user: 'user',
                password: 'password',
                workItemId: 'testworkitemid',
                node: 'xyz'
            };
            redfishJob.initClient = sinon.stub().resolves(redfishApi);
            redfishJob.collectChassisData = sinon.stub().resolves(chassisData[1].body);
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
                        expect(redfishJob.collectChassisData).to.be.calledOnce;
                        done();
                    } catch (e) {
                        done(e);
                    }
                });
            });
        });
        
        it("should initialize redfish client", function() {
            return expect(redfishJob.initClient({
                username:'user', 
                password:'password',
                uri: 'http://testapi'
            })).to.be.fullfilled;
        });
        
        it("should run collectChassis for each command", function() {
            redfishApi.listChassisAsync = sandbox.stub().resolves(listChassisData);
            redfishApi.getPowerAsync = sandbox.stub().resolves(chassisData);
            redfishApi.getThermalAsync = sandbox.stub().resolves(chassisData);
            _.forEach(['power', 'thermal'], function(command) {
                return redfishJob.collectChassisData(redfishApi, command)
                .then(function(data) {
                    expect(data[0]).to.equal(chassisData[1].body);
                });
            });
        });
        
        it("should fail collectChassis for unknown command", function() {
            redfishApi.listChassisAsync = sandbox.stub().resolves(listChassisData);
            return redfishJob.collectChassisData(redfishApi, 'unknown')
            .catch(function(data) {
                expect(data.message).to.equal('Unsupported Chassis Command: unknown');
            });
        });
        
        it("should fail collectChassis with no data", function() {
            redfishApi.listChassisAsync = sandbox.stub().resolves(listChassisData);
            redfishApi.getPowerAsync = sandbox.stub().resolves([null, {body: undefined}]);
            return redfishJob.collectChassisData(redfishApi, 'power')
            .catch(function(data) {
                expect(data.message).to.equal('No Data Found For Command: power');
            });
        });
        
        it("should fail getPowerAsync with error", function() {
            redfishApi.listChassisAsync = sandbox.stub().resolves(listChassisData);
            redfishApi.getPowerAsync = sandbox.stub().rejects({response: {text : 'error text'}});
            return redfishJob.collectChassisData(redfishApi, 'power')
            .catch(function(data) {
                expect(data.message).to.equal('error text');
            });
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
