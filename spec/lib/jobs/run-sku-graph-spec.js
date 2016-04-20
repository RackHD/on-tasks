// Copyright 2015, EMC, Inc.
/* jshint node:true */

'use strict';

describe("Job.Graph.RunSku", function () {
    var waterline = {};
    var uuid;
    var RunSkuGraphJob;
    var workflowTool;
    var Errors;
    var Constants;
    var fakeNode;
    var fakeSku;
    var env;
    var fakeGraphInfo;
    var fakeEnv;

    before(function () {
        // create a child injector with on-core and the base pieces we need to test this
        helper.setupInjector([
            helper.require('/spec/mocks/logger.js'),
            helper.require('/lib/jobs/base-job.js'),
            helper.require('/lib/jobs/run-sku-graph.js'),
            helper.require('/lib/utils/job-utils/workflow-tool.js'),
            helper.di.simpleWrapper(waterline, 'Services.Waterline'),
            helper.di.simpleWrapper({}, 'Task.taskLibrary')
        ]);

        RunSkuGraphJob = helper.injector.get('Job.Graph.RunSku');
        workflowTool = helper.injector.get('JobUtils.WorkflowTool');
        Errors = helper.injector.get('Errors');
        Constants = helper.injector.get('Constants');
        uuid = helper.injector.get('uuid');
        env = helper.injector.get('Services.Environment');

        waterline.skus = {
            needOne: sinon.stub().resolves()
        };
        waterline.nodes = {
            findByIdentifier: sinon.stub().resolves()
        };
    });

    beforeEach(function () {
        fakeNode = {
            id: 'bc7dab7e8fb7d6abf8e7d6ab',
            sku: 'testskuid'
        };

        fakeSku = {
            discoveryGraphName: 'testskugraph',
            discoveryGraphOptions: {
                'option': 'test'
            }
        };

        fakeGraphInfo = {
            name: 'testskugraph',
            options: {
                foo: 'bar'
            }
        };

        fakeEnv = {
            postDiscoveryGraph: {
                name: 'testskugraph',
                options: {
                    foo: 'bar'
                }
            }
        };

        this.sandbox = sinon.sandbox.create();
        this.sandbox.stub(RunSkuGraphJob.prototype, '_subscribeActiveTaskExists');
        this.sandbox.stub(RunSkuGraphJob.prototype, '_subscribeGraphFinished');
        this.sandbox.stub(workflowTool, 'runGraph').resolves();
        waterline.skus.needOne.reset();
        waterline.nodes.findByIdentifier.reset();
    });

    afterEach(function() {
        this.sandbox.restore();
    });

    describe('prototype._findSkuGraphInfo', function() {
        var _findSkuGraphInfo;
        var sandbox;

        before(function() {
            sandbox = sinon.sandbox.create();
            var job = new RunSkuGraphJob({ nodeId: fakeNode.id },
                { target: fakeNode.id }, uuid.v4());
            _findSkuGraphInfo = job._findSkuGraphInfo;
        });

        afterEach(function() {
            sandbox.restore();
        });

        //this also test the skupack will take precedence
        it('should return the sku graph info of skupack', function() {
            sandbox.stub(env, 'get').withArgs('config', {}, [fakeNode.sku, Constants.Scope.Global])
                .resolves(fakeEnv);
            waterline.skus.needOne.resolves(fakeSku);

            return expect(_findSkuGraphInfo(fakeNode)).to.become(fakeGraphInfo);
        });

        it('should return the sku graph info of sku document', function() {
            sandbox.stub(env, 'get').withArgs('config', {}, [fakeNode.sku, Constants.Scope.Global])
                .resolves({});
            waterline.skus.needOne.resolves(fakeSku);

            return expect(_findSkuGraphInfo(fakeNode)).to.become({
                name: fakeSku.discoveryGraphName,
                options: fakeSku.discoveryGraphOptions
            });
        });

        it('should return nothing if the node has no sku', function() {
            delete fakeNode.sku;
            sandbox.stub(env, 'get').withArgs('config', {}, [Constants.Scope.Global]).resolves({});

            return expect(_findSkuGraphInfo(fakeNode)).to.become(undefined);
        });

        it('should return nothing if both env & sku document don\'t have graph info', function() {
            sandbox.stub(env, 'get').withArgs('config', {}, [fakeNode.sku, Constants.Scope.Global])
                .resolves({});
            delete fakeSku.discoveryGraphName;
            waterline.skus.needOne.resolves(fakeSku);

            return expect(_findSkuGraphInfo(fakeNode)).to.become(undefined);
        });

        it('should throw error if sku document is not found', function() {
            sandbox.stub(env, 'get').withArgs('config', {}, [fakeNode.sku, Constants.Scope.Global])
                .resolves({});
            waterline.skus.needOne.rejects();
            return expect(_findSkuGraphInfo(fakeNode)).to.be.rejected;
        });

        it('should throw error if lookup env throws error', function() {
            sandbox.stub(env, 'get').rejects();
            return expect(_findSkuGraphInfo(fakeNode)).to.be.rejected;
        });
    });

    it('should run a graph', function() {
        waterline.nodes.findByIdentifier.resolves(fakeNode);
        waterline.skus.needOne.resolves(fakeSku);
        var job = new RunSkuGraphJob(
            { nodeId: fakeNode.id, instanceId: 'testinstance' },
            { target: fakeNode.id },
            uuid.v4()
        );
        this.sandbox.stub(job, '_findSkuGraphInfo').resolves(fakeGraphInfo);
        job._run();

        expect(job._subscribeGraphFinished).to.have.been.calledOnce;
        var cb = job._subscribeGraphFinished.firstCall.args[0];

        setImmediate(function() {
            cb(Constants.Task.States.Succeeded);
        });

        return job._deferred
        .then(function() {
            expect(job._findSkuGraphInfo).to.have.been.calledOnce.and.calledWith(fakeNode);
            expect(workflowTool.runGraph).to.have.been.calledOnce.and.calledWith(
                fakeNode.id,
                fakeGraphInfo.name,
                _.merge(fakeGraphInfo.options, { instanceId: 'testinstance' })
            );

            // Assert here that we override the sub-graphs instanceId so that
            // our AMQP subscription to the graph finished event is actually
            // listening on the right routing key!!!
            expect(job.graphId).to.be.ok;
            expect(workflowTool.runGraph.firstCall.args[2])
                .to.have.property('instanceId')
                .that.equals(job.graphId);
        });
    });

    it('should fail on a failed graph', function() {
        waterline.nodes.findByIdentifier.resolves(fakeNode);
        waterline.skus.needOne.resolves(fakeSku);
        this.sandbox.stub(env, 'get').resolves(fakeEnv);
        var job = new RunSkuGraphJob({ nodeId: fakeNode.id }, { target: fakeNode.id }, uuid.v4());
        job._run();

        expect(job._subscribeGraphFinished).to.have.been.calledOnce;
        var cb = job._subscribeGraphFinished.firstCall.args[0];

        setImmediate(function() {
            cb(Constants.Task.States.Failed);
        });

        return expect(job._deferred).to.be.rejectedWith(/Graph.*failed with status/);
    });

    it('should noop if there is no sku graph info is found', function() {
        waterline.nodes.findByIdentifier.resolves(fakeNode);
        var job = new RunSkuGraphJob({ nodeId: fakeNode.id }, { target: fakeNode.id }, uuid.v4());
        this.sandbox.stub(job, '_findSkuGraphInfo').resolves({});
        job._run();

        // The assertion here is that the job promise should just be resolved
        // without having to trigger the _subscribeGraphFinished callback.
        return expect(job._deferred).to.be.fulfilled;
    });

    it('should fail if finding graph info throws exception', function() {
        waterline.nodes.findByIdentifier.resolves(fakeNode);
        var job = new RunSkuGraphJob({ nodeId: fakeNode.id }, { target: fakeNode.id }, uuid.v4());
        this.sandbox.stub(job, '_findSkuGraphInfo').rejects(new Errors.NotFoundError('test'));
        job._run();

        return expect(job._deferred).to.be.rejectedWith(Errors.NotFoundError);
    });

    it('should fail if node document is not found', function() {
        waterline.nodes.findByIdentifier.resolves();
        var job = new RunSkuGraphJob({ nodeId: fakeNode.id }, { target: fakeNode.id }, uuid.v4());
        job._run();

        return expect(job._deferred).to.be.rejected;
    });

    it('should fail on internal errors with _run() code', function() {
        waterline.nodes.findByIdentifier.rejects(new Error('test'));
        var job = new RunSkuGraphJob({ nodeId: fakeNode.id }, { target: fakeNode.id }, uuid.v4());
        job._run();

        return expect(job._deferred).to.be.rejectedWith('test');
    });
});
