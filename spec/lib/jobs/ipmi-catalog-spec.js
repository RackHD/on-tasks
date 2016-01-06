// Copyright 2015, EMC, Inc.
/* jshint node:true */

'use strict';

describe('LocalIpmi Catalog Job', function () {
    var IpmiCatalogJob;
    var Promise;
    var uuid;
    var mockWaterline = {
        nodes: {},
        catalogs: {}
    };

    before(function() {
        helper.setupInjector(
            _.flattenDeep([
                helper.require('/lib/jobs/base-job'),
                helper.require('/lib/jobs/ipmi-catalog'),
                helper.require('/lib/utils/job-utils/command-parser'),
                helper.di.simpleWrapper(mockWaterline, 'Services.Waterline')
            ])
        );

        Promise = helper.injector.get('Promise');
        IpmiCatalogJob = helper.injector.get('Job.LocalIpmi.Catalog');
        uuid = helper.injector.get('uuid');
    });

    describe('input validation', function(){
        var job;

        beforeEach('Ipmi catalog job input validation', function(){
            var options = {
                commands: ['test_command'],
                acceptedResponseCodes: [1]
            };
            job = new IpmiCatalogJob(options, { target: 'bc7dab7e8fb7d6abf8e7d6ac' }, uuid.v4());
            mockWaterline.nodes.findByIdentifier = function(){};

            this.sandbox = sinon.sandbox.create();
            this.sandbox.stub(job, '_subscribeActiveTaskExists').resolves();
            this.sandbox.stub(mockWaterline.nodes,'findByIdentifier');
        });

        afterEach('Ipmi catalog job input validation', function(){
            this.sandbox = sinon.sandbox.restore();
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
                        'No node for ipmi catalog');
                    done();
                } catch (e) {
                    done(e);
                }
            });
        });

        it('should fail if ipmi obmSetting does not exist', function(done) {
            var node = {
                id: 'bc7dab7e8fb7d6abf8e7d6ac',
                obmSettings: [
                    {
                        config: {
                        }
                    }
                ]
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
                        'No ipmi obmSetting for ipmi catalog');
                    done();
                } catch (e) {
                    done(e);
                }
            });
        });
    });

    describe('run command', function(){
        var job;

        beforeEach('Ipmi catalog job run command', function(){
            var options = {
                commands: [
                    'sdr',
                    'lan print'
                ],
                acceptedResponseCodes: [1]
            };
            job = new IpmiCatalogJob(options, { target: 'bc7dab7e8fb7d6abf8e7d6ac' }, uuid.v4());

            mockWaterline.nodes.findByIdentifier = function(){};
            this.sandbox = sinon.sandbox.create();
            this.sandbox.stub(mockWaterline.nodes,'findByIdentifier');
            this.sandbox.stub(job, '_subscribeActiveTaskExists').resolves();
        });

        afterEach('Ipmi catalog job input validation', function(){
            this.sandbox = sinon.sandbox.restore();
        });

        it('should transform command correctly', function() {
            var cmds = [];
            var config = {
                    host: '1.2.3.4',
                    user: 'admin',
                    password: 'password'
                };

            _.forEach(job.commands, function(cmd){
                cmds.push(job.formatCmd(config, cmd));
            });

            expect(cmds).to.deep.equal([
                ['-U', 'admin', '-P', 'password', '-H', '1.2.3.4', 'sdr'],
                ['-U', 'admin', '-P', 'password', '-H', '1.2.3.4', 'lan', 'print'],
            ]);
        });

        it('should run command and process response', function() {
            var node = {
                id: 'bc7dab7e8fb7d6abf8e7d6ac',
                obmSettings: [
                    {
                        service: 'ipmi-obm-service',
                        config: {
                            host: '1.2.3.4',
                            user: 'admin',
                            password: 'password'
                        }
                    }
                ]
            };

            this.sandbox.stub(job,'runCommand').resolves();
            this.sandbox.stub(job,'handleResponse').resolves();

            mockWaterline.nodes.findByIdentifier.resolves(node);

            return job.run()
            .then(function() {
                expect(job.runCommand).to.have.been.called;
                expect(job.handleResponse).to.have.been.called;
            });
        });

    });

    describe('handle response', function() {
        var waterline;
        var parser;
        var job;

        before('Ipmi Catalog Job handle response before', function() {
            waterline = helper.injector.get('Services.Waterline');
            parser = helper.injector.get('JobUtils.CommandParser');
        });

        beforeEach('Ipmi Catalog Job handle response beforeEach', function() {
            var options = {
                commands: [
                    'sdr',
                    'lan print'
                ],
                acceptedResponseCodes: [1]
            };
            job = new IpmiCatalogJob(options, { target: 'bc7dab7e8fb7d6abf8e7d6ac' }, uuid.v4());

            mockWaterline.nodes.findByIdentifier = function(){};
            mockWaterline.catalogs.create = function(){};

            this.sandbox = sinon.sandbox.create();
            this.sandbox.stub(mockWaterline.nodes,'findByIdentifier');
            this.sandbox.stub(mockWaterline.catalogs,'create');
            this.sandbox.stub(parser, 'parseTasks');
        });

        afterEach('Ipmi catalog job input validation', function(){
            this.sandbox = sinon.sandbox.restore();
        });

        it('should create catalog entries for response data', function() {
            parser.parseTasks.resolves([
                {
                    store: true,
                    source: 'test-source-1',
                    data: 'test data 1'
                },
                {
                    store: true,
                    source: undefined,
                    data: 'test data 2'
                },
                {
                    store: false,
                    source: 'test-source-3',
                    data: 'test data 3'
                },
                {
                    error: {},
                    source: 'test-error-source'
                }
            ]);

            return job.handleResponse([])
            .then(function() {
                // Make sure we only catalog objects with store: true and no error
                expect(waterline.catalogs.create).to.have.been.calledTwice;
                expect(waterline.catalogs.create).to.have.been.calledWith({
                    node: job.nodeId,
                    source: 'test-source-1',
                    data: 'test data 1'
                });
                expect(waterline.catalogs.create).to.have.been.calledWith({
                    node: job.nodeId,
                    source: undefined,
                    data: 'test data 2'
                });
            });
        });
    });
});
