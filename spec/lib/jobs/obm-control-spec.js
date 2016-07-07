// Copyright 2015, EMC, Inc.
/* jshint node:true */

'use strict';

var uuid = require('node-uuid');

describe("Job.Obm.Node", function () {
    var base = require('./base-spec');
    var Job;
    var Errors,
        testOptions = {
            action: 'reboot',
            obmServiceName: 'ipmi-obm-service',
            delay: 1,
            retries: 1
        };

    var mockWaterline = {
        nodes: {
            findByIdentifier: sinon.stub()
        },
        obms: {
            findByNode: sinon.stub(),
            find: sinon.stub()
        }
    };

    base.before("Job.Obm.Node before", function (context) {
        // create a child injector with renasar-core and the base pieces we need to test this
        helper.setupInjector([
            helper.require('/lib/jobs/base-job.js'),
            helper.require('/lib/jobs/obm-control.js'),
            helper.require('/lib/services/base-obm-service.js'),
            helper.require('/lib/services/ipmi-obm-service.js'),
            helper.require('/lib/services/noop-obm-service.js'),
            helper.require('/lib/services/obm-service.js'),
            helper.di.simpleWrapper(mockWaterline, 'Services.Waterline')
        ]);
        Job = helper.injector.get('Job.Obm.Node');
        Errors = helper.injector.get('Errors');
        context.Jobclass = Job;
    });

    beforeEach("Job.Obm.Node beforeEach", function () {
        mockWaterline.obms.findByNode.reset();
        mockWaterline.obms.findByNode.resolves();
        mockWaterline.obms.find.reset();
        mockWaterline.obms.find.resolves();
        mockWaterline.nodes.findByIdentifier.reset();
        mockWaterline.nodes.findByIdentifier.resolves();
    });

    describe('Base', function () {
        base.examples();
    });

    describe('run', function() {
        var job;
        var ObmService;
        var ObmServiceSpy;

        before('Job.Obm.Node run before', function() {
            ObmService = helper.injector.get('Task.Services.OBM');
            sinon.stub(ObmService.prototype, 'reboot');
            ObmServiceSpy = sinon.spy(ObmService, 'create');
        });

        beforeEach('Job.Obm.Node run beforeEach', function() {
            job = new Job(testOptions, { target: '54da9d7bf33e0405c75f7111' }, uuid.v4());
            job._subscribeActiveTaskExists = sinon.stub().resolves();
            job.killObm = sinon.stub().resolves();
            ObmService.prototype.reboot.reset();
            ObmServiceSpy.reset();
        });

        after('Job.Obm.Node run after', function() {
            ObmService.prototype.reboot.restore();
        });

        it('should fail if node does not exist', function(done) {
            mockWaterline.obms.findByNode.resolves(null);
            mockWaterline.nodes.findByIdentifier.resolves(null);

            job.run()
            .then(function() {
                done(new Error("Expected job to fail"));
            })
            .catch(function(e) {
                try {
                    expect(e).to.have.property('name').that.equals('AssertionError');
                    expect(e).to.have.property('message').that.equals(
                        'Node should exist to run OBM command');
                    done();
                } catch (e) {
                    done();
                }
            });
        });

        it('should fail if node does not have obmSettings', function(done) {
            mockWaterline.obms.findByNode.resolves(null);
            mockWaterline.obms.find.resolves([]);
            mockWaterline.nodes.findByIdentifier.resolves({name: 'a node'});

            job.run()
            .then(function() {
                done(new Error("Expected job to fail"));
            })
            .catch(function(e) {
                try {
                    expect(e).to.have.property('name').that.equals('AssertionError');
                    expect(e).to.have.property('message').and.to.match(
                        /ipmi-obm-service does not exist on this node/);
                    done();
                } catch (e) {
                    done(e);
                }
            });
        });

        it('should fail if node does not have an obm config for the obm service', function(done) {
            var obm = {
                service: 'bad-obm-service'
            };
            mockWaterline.obms.findByNode.resolves(obm);

            job.run()
            .then(function() {
                done(new Error("Expected job to fail"));
            })
            .catch(function(e) {
                try {
                    expect(e).to.have.property('name').that.equals('AssertionError');
                    expect(e).to.have.property('message').that.equals(
                        'OBM should have settings for service: bad-obm-service (object) is required'
                    );
                    done();
                } catch (e) {
                    done(e);
                }
            });
        });

        it('should fail if there is no OBM services and no default', function(){
            // user is not passing any default obm service to use for this test...
            var testOptions = {
                action: 'reboot',
                delay: 1,
                retries: 1
            };

            job = new Job(testOptions, { target: '54da9d7bf33e0405c75f7111' }, uuid.v4());
            job._subscribeActiveTaskExists = sinon.stub().resolves();
            job.killObm = sinon.stub().resolves();
            mockWaterline.obms.findByNode.resolves();
            mockWaterline.nodes.findByIdentifier.resolves({name: 'a node'});

            return expect(job.run()).to.be.rejectedWith(Error,
                 /ipmi-obm-service does not exist on this node/);

        });

        it('should default to ipmi-obm-service', function(){
            // user is not passing any default obm service to use for this test...
            var testOptions = {
                action: 'reboot',
                delay: 1,
                retries: 1
            };

            job = new Job(testOptions, { target: '54da9d7bf33e0405c75f7111' }, uuid.v4());
            job._subscribeActiveTaskExists = sinon.stub().resolves();
            job.killObm = sinon.stub().resolves();

            var node = {name: 'a node'};
            var obm =
              {
                  service: 'ipmi-obm-service',
                  config: {}
              }
            mockWaterline.nodes.findByIdentifier.resolves(node);
            mockWaterline.obms.findByNode.resolves(obm);

            return job.run()
            .then(function() {
                expect(job.settings).to.equal(obm);
            });
        });


        it('should run an OBM command with nodeId specified in options', function() {
            var obm =
            {
                service: 'ipmi-obm-service',
                config: {
                    "user": "admin",
                    "password": "admin",
                    "host": "10.0.0.254"
                }
            };
            mockWaterline.obms.findByNode.resolves(obm);

            testOptions.nodeId = job.context.target;
            job = new Job(testOptions, { }, uuid.v4());
            job._subscribeActiveTaskExists = sinon.stub().resolves();
            job.killObm = sinon.stub().resolves();

            return job.run()
            .then(function() {
                var ipmiObmServiceFactory = helper.injector.get('ipmi-obm-service');
                expect(ObmServiceSpy).to.have.been.calledWith(
                    job.nodeId, ipmiObmServiceFactory, obm, testOptions);
                expect(ObmService.prototype.reboot).to.have.been.calledOnce;
            });
        });

        it('should run an OBM command', function() {
            var obm =
            {
                service: 'ipmi-obm-service',
                config: {
                    "user": "admin",
                    "password": "admin",
                    "host": "10.0.0.254"
                }
            };
            mockWaterline.obms.findByNode.resolves(obm);

            return job.run()
            .then(function() {
                var ipmiObmServiceFactory = helper.injector.get('ipmi-obm-service');
                expect(ObmServiceSpy).to.have.been.calledWith(
                    job.nodeId, ipmiObmServiceFactory, obm,
                    testOptions);
                expect(ObmService.prototype.reboot).to.have.been.calledOnce;
            });
        });

        it('should create new Job with node selected from target ' +
           '(when node specified in both target and options)', function() {
            // local options with nodeId set
            var options = {
                action: 'reboot',
                obmServiceName: 'ipmi-obm-service',
                nodeId: 'not_this_one'
            };

            var newJob = new Job(options, { target: 'pick_me' }, uuid.v4());
            expect(newJob.nodeId).to.equal('pick_me');
        });

        it('should create a new Job with node selected from target', function() {
            // local options with no nodeId
            var options = {
                action: 'reboot',
                obmServiceName: 'ipmi-obm-service'
            };

            var newJob = new Job(options, { target: 'pick_me'}, uuid.v4());
            expect(newJob.nodeId).to.equal('pick_me');
        });

        it('should create a new Job with node selected from options', function() {
            // local options with nodeId
            var options = {
                nodeId: 'pick_me',
                action: 'reboot',
                obmServiceName: 'ipmi-obm-service'
            };

            var newJob = new Job(options, { }, uuid.v4());
            expect(newJob.nodeId).to.equal('pick_me');
        });

        it('should fail to create a new Job if node is missing ' +
           '(from options and target)', function() {

            // local options with no nodeId field
            var options = {
                action: 'reboot',
                obmServiceName: 'ipmi-obm-service'
            };

            expect(function() {
                return new Job(options, {}, uuid.v4());
            }).to.throw(Errors.AssertionError, /nodeId/);
        });
    });

    describe('cancel', function() {
        it('should cancel an outstanding OBM child process on job cancellation');
    });
});
