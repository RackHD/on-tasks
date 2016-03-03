// Copyright 2016, EMC, Inc.
/* jshint node:true */

'use strict';

describe(require('path').basename(__filename), function () {
    var uuid;
    var RacadmCatalogJob;
    var Promise;
    var job;
    var racadmTool;
    var Errors;
    var mockWaterline = {
        nodes: {},
        catalogs: {}
    };

    before(function() {
        helper.setupInjector([
            helper.require('/lib/jobs/base-job'),
            helper.require('/lib/jobs/dell-racadm-catalog-job'),
            helper.require('/lib/utils/job-utils/racadm-tool.js'),
            helper.require('/lib/utils/job-utils/racadm-parser.js'),
            helper.require('/lib/utils/job-utils/job-helper.js'),
            helper.require('/lib/utils/job-utils/command-parser'),
            helper.di.simpleWrapper(mockWaterline, 'Services.Waterline')
        ]);
        Promise = helper.injector.get('Promise');
        RacadmCatalogJob = helper.injector.get('Job.Dell.RacadmCatalog');
        racadmTool = helper.injector.get('JobUtils.RacadmTool');
        uuid = helper.injector.get('uuid');
        Errors = helper.injector.get('Errors');
    });

    describe('Input validation', function() {
        beforeEach('Dell Racadm Catalog Input Validation', function() {
            var options = {
                serverUsername: "onrack",
                serverPassword: "onrack",
                serverFilePath: "//1.2.3.4/src/bios.xml"
            };
            job = new RacadmCatalogJob(options, {}, uuid.v4());
            mockWaterline.nodes.findByIdentifier = function() {
            };
            this.sandbox = sinon.sandbox.create();
            //this.sandbox.stub(job, '_subscribeActiveTaskExists').resolves();
            this.sandbox.stub(mockWaterline.nodes, 'findByIdentifier');
        });

        afterEach('Dell Racadm Catalog Input Validation', function() {
            this.sandbox.restore();
        });

        it('should fail if node does not exist', function() {
            mockWaterline.nodes.findByIdentifier.resolves(null);
            return expect(job.run()).to.be.rejectedWith(Errors.AssertionError,
                'No node for dell racadm catalog');
        });

        it('should fail if ipmi obmSetting does not exist', function() {
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
            return expect(job.run()).to.be.rejectedWith(Errors.AssertionError,
                'No ipmi obmSetting for dell racadm catalog');
        });
    });

    describe('Dell Racadm getConfigCatalog', function() {
        var options;

        beforeEach('Dell Racadm getConfigCatalog', function() {
            options = {
                serverUsername: "onrack",
                serverPassword: "onrack",
                serverFilePath: "//1.2.3.4/src/bios.xml"
            };
            job = new RacadmCatalogJob(options, {}, uuid.v4());
            mockWaterline.nodes.findByIdentifier = function(){};

            this.sandbox = sinon.sandbox.create();
            this.sandbox.stub(job, '_subscribeActiveTaskExists').resolves();
            this.sandbox.stub(mockWaterline.nodes,'findByIdentifier');
        });

        afterEach('Dell Racadm getConfigCatalog', function() {
            this.sandbox.restore();
        });

        it("should call racadmTool.getConfigCatalog", function(){
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

            var getConfigCatalog = this.sandbox.stub(racadmTool,'getConfigCatalog');
            var cifsInfo = {user: options.serverUsername, password: options.serverPassword ,
                filePath: options.serverFilePath};
            mockWaterline.nodes.findByIdentifier.resolves(node);
            /*
            getConfigCatalog.resolves(
                {
                    status:"Completed"
                }
            );*/
            return job.run()
                .then(function() {
                    expect(getConfigCatalog).to.have.been.calledWith(
                        node.obmSettings[0].config.host, node.obmSettings[0].config.user,
                        node.obmSettings[0].config.password,cifsInfo);
                });
        });
    });

    describe('handle response', function() {
        var waterline;
        var parser;
        var job;

        before('Dell Racadm Catalog Job handle response before', function() {
            waterline = helper.injector.get('Services.Waterline');
            parser = helper.injector.get('JobUtils.CommandParser');
        });

        beforeEach('Dell Racadm Catalog Job handle response beforeEach', function() {
            var options = {
                commands: [
                    'sdr',
                    'lan print'
                ],
                acceptedResponseCodes: [1]
            };
            job = new RacadmCatalogJob(options, { target: 'bc7dab7e8fb7d6abf8e7d6ac' }, uuid.v4());

            mockWaterline.nodes.findByIdentifier = function(){};
            mockWaterline.catalogs.create = function(){};

            this.sandbox = sinon.sandbox.create();
            this.sandbox.stub(mockWaterline.nodes,'findByIdentifier');
            this.sandbox.stub(mockWaterline.catalogs,'create');
            this.sandbox.stub(parser, 'parseTasks');
        });

        afterEach('Dell Racadm Catalog Job input validation', function(){
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
