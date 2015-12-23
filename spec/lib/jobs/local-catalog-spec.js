// Copyright 2015, EMC, Inc.
/* jshint node:true */

'use strict';

describe('Job.Local.Catalog', function () {
    var LocalCatalogJob,
        Promise,
        uuid,
        parser,
        options,
        context,
        waterline,
        mockWaterline = {
            nodes: {},
            catalogs: {}
        };

    afterEach(function () {
        this.sandbox.restore();
    });

    before(function() {
        this.sandbox = sinon.sandbox.create();
        helper.setupInjector(
            _.flatten([
                helper.require('/lib/jobs/base-job'),
                helper.require('/lib/jobs/local-catalog'),
                helper.require('/lib/utils/job-utils/command-parser'),
                helper.di.simpleWrapper(mockWaterline, 'Services.Waterline')
            ])
        );

        Promise = helper.injector.get('Promise');
        LocalCatalogJob = helper.injector.get('Job.Local.Catalog');
        uuid = helper.injector.get('uuid');
        parser = helper.injector.get('JobUtils.CommandParser');
        waterline = helper.injector.get('Services.Waterline');
        context = {
            target: 'bc7dab7e8fb7d6abf8e7d6ac'
        };
        options = {
            commands: ["sudo /usr/sbin/lldpcli show neighbor -f keyvalue"]
        };
    });

    describe('input validation', function(){
        var job;
        beforeEach('Local catalog job input validation', function(){
            job = new LocalCatalogJob(options, context, uuid.v4());
            mockWaterline.nodes.findByIdentifier = function(){};
            this.sandbox.stub(job, '_subscribeActiveTaskExists').resolves();
            this.sandbox.stub(mockWaterline.nodes,'findByIdentifier');
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
                        'No node for local catalog');
                    done();
                } catch (e) {
                    done(e);
                }
            });
        });
    });

    describe('run command', function(){
        var job;
        beforeEach('Local catalog job run command', function(){
            job = new LocalCatalogJob(options, context, uuid.v4());
            mockWaterline.nodes.findByIdentifier = function(){};
            this.sandbox.stub(mockWaterline.nodes,'findByIdentifier');
            this.sandbox.stub(parser, 'validateParser');
            this.sandbox.stub(job, '_subscribeActiveTaskExists').resolves();
        });

        it('should run command and process response', function() {
            parser.validateParser.returns(Promise.resolve({
                command: options.commands[0]
            }));
            this.sandbox.stub(job,'runCommand').resolves();
            this.sandbox.stub(job,'handleResponse').resolves();
            mockWaterline.nodes.findByIdentifier.resolves({id: 'bc7dab7e8fb7d6abf8e7d6ac'});

            return job.run()
            .then(function() {
                expect(parser.validateParser).to.have.been.called;
                expect(job.runCommand).to.have.been.called;
                expect(job.handleResponse).to.have.been.called;
            });
        });

        it('should run command and fail to validate parser', function() {
            job.commands = ['fooey'];
            var error = new Error("Command parser does not exist");
            parser.validateParser.returns(Promise.reject({
                command: 'fooey',
                error: error
            }));
            this.sandbox.stub(parser, 'parseTasks').resolves();
            mockWaterline.nodes.findByIdentifier.resolves({id: 'bc7dab7e8fb7d6abf8e7d6ac'});

            return job.run()
            .then(function() {
                expect(parser.validateParser).to.have.been.called;
            });
        });
    });

    describe('handle response', function() {
        var job;
        beforeEach('Local Catalog Job handle response beforeEach', function() {
            job = new LocalCatalogJob(options, context, uuid.v4());
            mockWaterline.nodes.findByIdentifier = function(){};
            mockWaterline.catalogs.create = function(){};

            this.sandbox.stub(mockWaterline.nodes,'findByIdentifier');
            this.sandbox.stub(mockWaterline.catalogs,'create');
            this.sandbox.stub(parser, 'parseTasks');
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
