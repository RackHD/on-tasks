// Copyright 2015, EMC, Inc.
/* jshint node:true */

'use strict';

var uuid = require('node-uuid');

describe("Job.Obm.Node", function () {
    var base = require('./base-spec');
    var Job;
    var Errors;

    var mockWaterline = {
        nodes: {
            findByIdentifier: sinon.stub()
        }
    };

    base.before("Job.Obm.Node before", function (context) {
        // create a child injector with renasar-core and the base pieces we need to test this
        helper.setupInjector([
            helper.require('/lib/jobs/base-job.js'),
            helper.require('/lib/jobs/obm-control.js'),
            helper.require('/lib/services/base-obm-service.js'),
            helper.require('/lib/services/ipmi-obm-service.js'),
            helper.require('/lib/services/obm-service.js'),
            helper.di.simpleWrapper(mockWaterline, 'Services.Waterline')
        ]);
        Job = helper.injector.get('Job.Obm.Node');
        Errors = helper.injector.get('Errors');
        context.Jobclass = Job;
    });

    beforeEach("Job.Obm.Node beforeEach", function () {
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
        var options = {
            nodeId: '',
            action: 'reboot',
            obmServiceName: 'ipmi-obm-service'
        };

        before('Job.Obm.Node run before', function() {
            ObmService = helper.injector.get('Task.Services.OBM');
            sinon.stub(ObmService.prototype, 'reboot');
            ObmServiceSpy = sinon.spy(ObmService, 'create');
        });

        beforeEach('Job.Obm.Node run beforeEach', function() {
            job = new Job(options, { target: '54da9d7bf33e0405c75f7111' }, uuid.v4());
            job._subscribeActiveTaskExists = sinon.stub().resolves();
            job.killObm = sinon.stub().resolves();
            ObmService.prototype.reboot.reset();
            ObmServiceSpy.reset();
        });

        after('Job.Obm.Node run after', function() {
            ObmService.prototype.reboot.restore();
        });

        it('should fail if node does not exist', function(done) {
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
            mockWaterline.nodes.findByIdentifier.resolves({});

            job.run()
            .then(function() {
                done(new Error("Expected job to fail"));
            })
            .catch(function(e) {
                try {
                    expect(e).to.have.property('name').that.equals('AssertionError');
                    expect(e).to.have.property('message').that.equals(
                        'Node should have OBM settings to run OBM command');
                    done();
                } catch (e) {
                    done(e);
                }
            });
        });

        it('should fail if node does not have an obm config for the obm service', function(done) {
            var node = {
                obmSettings: {
                    'bad-obm-service': {}
                }
            };
            mockWaterline.nodes.findByIdentifier.resolves(node);

            job.run()
            .then(function() {
                done(new Error("Expected job to fail"));
            })
            .catch(function(e) {
                try {
                    expect(e).to.have.property('name').that.equals('AssertionError');
                    expect(e).to.have.property('message').that.equals(
                        'Node should have OBM settings for service: ' + 'ipmi-obm-service');
                    done();
                } catch (e) {
                    done(e);
                }
            });
        });

        it('should run an OBM command with nodeId specified in options', function() {
            var node = {
                obmSettings: [
                    {
                        service: 'ipmi-obm-service',
                        config: {
                            "user": "admin",
                            "password": "admin",
                            "host": "10.0.0.254"
                        }
                    }
                ]
            };
            mockWaterline.nodes.findByIdentifier.resolves(node);

            options.nodeId = job.context.target;
            job = new Job(options, { }, uuid.v4());
            job._subscribeActiveTaskExists = sinon.stub().resolves();
            job.killObm = sinon.stub().resolves();

            return job.run()
            .then(function() {
                var ipmiObmServiceFactory = helper.injector.get('ipmi-obm-service');
                expect(ObmServiceSpy).to.have.been.calledWith(
                    job.nodeId, ipmiObmServiceFactory, node.obmSettings[0],
                    undefined, undefined);
                expect(ObmService.prototype.reboot).to.have.been.calledOnce;
            });
        });

        it('should run an OBM command', function() {
            var node = {
                obmSettings: [
                    {
                        service: 'ipmi-obm-service',
                        config: {
                            "user": "admin",
                            "password": "admin",
                            "host": "10.0.0.254"
                        }
                    }
                ]
            };
            mockWaterline.nodes.findByIdentifier.resolves(node);

            return job.run()
            .then(function() {
                var ipmiObmServiceFactory = helper.injector.get('ipmi-obm-service');
                expect(ObmServiceSpy).to.have.been.calledWith(
                    job.nodeId, ipmiObmServiceFactory, node.obmSettings[0],
                    undefined, undefined);
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
