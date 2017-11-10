// Copyright 2015, EMC, Inc.
/* jshint node:true */

'use strict';

describe("Job.Graph.RunSku", function () {
    var waterline = {};
    var uuid;
    var RunSkuGraphJob;
    var RunGraphJob;
    var workflowTool;
    var Errors;
    var Constants;
    var fakeNode;
    var fakeSku;

    before(function () {
        // create a child injector with on-core and the base pieces we need to test this
        helper.setupInjector([
            helper.require('/spec/mocks/logger.js'),
            helper.require('/lib/jobs/run-graph.js'),
            helper.require('/lib/jobs/base-job.js'),
            helper.require('/lib/jobs/run-sku-graph.js'),
            helper.require('/lib/task-graph.js'),
            helper.require('/lib/task.js'),
            helper.require('/lib/utils/job-utils/workflow-tool.js'),
            helper.require('/lib/utils/task-option-validator.js'),
            helper.di.simpleWrapper(waterline, 'Services.Waterline'),
            helper.di.simpleWrapper({}, 'Task.taskLibrary')
        ]);

        RunGraphJob = helper.injector.get('Job.Graph.Run');
        RunSkuGraphJob = helper.injector.get('Job.Graph.RunSku');
        workflowTool = helper.injector.get('JobUtils.WorkflowTool');
        Errors = helper.injector.get('Errors');
        Constants = helper.injector.get('Constants');
        uuid = helper.injector.get('uuid');

        waterline.skus = {
            needOne: sinon.stub().resolves()
        };
        waterline.nodes = {
            findByIdentifier: sinon.stub().resolves()
        };
        waterline.graphobjects = {
            findOneMongo: sinon.stub().resolves()
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

        this.sandbox = sinon.sandbox.create();
        this.sandbox.stub(RunSkuGraphJob.prototype, '_subscribeActiveTaskExists');
        this.sandbox.stub(RunSkuGraphJob.prototype, '_subscribeGraphFinished');
        this.sandbox.stub(workflowTool, 'runGraph').resolves();
        waterline.skus.needOne.reset();
        waterline.nodes.findByIdentifier.reset();
        waterline.graphobjects.findOneMongo.reset();
    });

    afterEach(function() {
        this.sandbox.restore();
    });

    it('should inherit from RunGraphJob', function() {
        var job = new RunSkuGraphJob({ nodeId: fakeNode.id }, { target: fakeNode.id }, uuid.v4());
        expect(job).to.be.an.instanceof(RunGraphJob);
    });

    it('should run a graph', function() {
        waterline.nodes.findByIdentifier.resolves(fakeNode);
        waterline.skus.needOne.resolves(fakeSku);
        var job = new RunSkuGraphJob({ nodeId: fakeNode.id }, { target: fakeNode.id }, uuid.v4());
        job._run();

        setImmediate(function() {
            job.finishWithState(Constants.Task.States.Succeeded);
        });

        return job._deferred
        .then(function() {
            expect(job._subscribeGraphFinished).to.have.been.calledOnce;
            expect(job._subscribeGraphFinished).to.have.been.calledWith(
                job.finishWithState
            );
            expect(waterline.nodes.findByIdentifier).to.have.been.calledOnce;
            expect(waterline.nodes.findByIdentifier).to.have.been.calledWith(fakeNode.id);

            expect(waterline.skus.needOne).to.have.been.calledOnce;
            expect(waterline.skus.needOne).to.have.been.calledWith({ id: fakeNode.sku });

            expect(workflowTool.runGraph).to.have.been.calledOnce;
            expect(workflowTool.runGraph).to.have.been.calledWith(
                fakeNode.id,
                fakeSku.discoveryGraphName,
                fakeSku.discoveryGraphOptions
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

    it('should run a graph with a proxy', function() {
        waterline.nodes.findByIdentifier.resolves(fakeNode);
        waterline.skus.needOne.resolves(fakeSku);
        var proxy = "12.1.1.1";
        var job = new RunSkuGraphJob(
                { nodeId: fakeNode.id },
                { target: fakeNode.id, proxy: proxy },
                uuid.v4()
                );
        job._run();

        setImmediate(function() {
            job.finishWithState(Constants.Task.States.Succeeded);
        });

        return job._deferred
        .then(function() {
            expect(job._subscribeGraphFinished).to.have.been.calledOnce;
            expect(job._subscribeGraphFinished).to.have.been.calledWith(
                job.finishWithState
            );
            expect(waterline.nodes.findByIdentifier).to.have.been.calledOnce;
            expect(waterline.nodes.findByIdentifier).to.have.been.calledWith(fakeNode.id);

            expect(waterline.skus.needOne).to.have.been.calledOnce;
            expect(waterline.skus.needOne).to.have.been.calledWith({ id: fakeNode.sku });

            expect(workflowTool.runGraph).to.have.been.calledOnce;
            expect(workflowTool.runGraph).to.have.been.calledWith(
                fakeNode.id,
                fakeSku.discoveryGraphName,
                fakeSku.discoveryGraphOptions,
                null,
                proxy
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
        var job = new RunSkuGraphJob({ nodeId: fakeNode.id }, { target: fakeNode.id }, uuid.v4());
        job._run();

        setImmediate(function() {
            job.finishWithState(Constants.Task.States.Failed);
        });
        
        return job._deferred
        .then(function(){
            throw new Error("Test should fail");
        }, function(err){
            expect(err.message).to.match(/Graph [0-9a-z\-]{36} failed with status failed/);
        })
        .finally(function(){
            clearInterval(job.subgraphPoll);
        });
    });

    it('should noop if there is no sku discovery graph defined', function() {
        waterline.nodes.findByIdentifier.resolves(fakeNode);
        waterline.skus.needOne.resolves(fakeSku);
        var job = new RunSkuGraphJob({ nodeId: fakeNode.id }, { target: fakeNode.id }, uuid.v4());
        job._run();
        this.sandbox.spy(job, "_done");
        delete fakeSku.discoveryGraphName;
        delete fakeSku.discoveryGraphOptions;

        // The assertion here is that the job promise should just be resolved
        // without having to trigger the _subscribeGraphFinished callback.
        return job._deferred
        .then(function(){
            expect(job._done).to.be.calledOnce;
        })
        .finally(function(){
            clearInterval(job.subgraphPoll);
        });
    });

    it('should noop if there is no sku', function() {
        delete fakeNode.sku;
        waterline.nodes.findByIdentifier.resolves(fakeNode);
        var job = new RunSkuGraphJob({ nodeId: fakeNode.id }, { target: fakeNode.id }, uuid.v4());
        this.sandbox.spy(job, "_done");
        job._run();

        // The assertion here is that the job promise should just be resolved
        // without having to trigger the _subscribeGraphFinished callback.
        return job._deferred
        .then(function(){
            expect(job._done).to.be.calledOnce;
        })
        .finally(function(){
            clearInterval(job.subgraphPoll);
        });
    });

    it('should fail if the sku does not exist', function() {
        waterline.nodes.findByIdentifier.resolves(fakeNode);
        waterline.skus.needOne.rejects(new Errors.NotFoundError('test'));
        var job = new RunSkuGraphJob({ nodeId: fakeNode.id }, { target: fakeNode.id }, uuid.v4());
        this.sandbox.spy(job, "_done");
        job._run();
        
        return job._deferred
        .then(function(){
            throw new Error("Test should fail");
        }, function(){
            expect(job._done).to.be.calledOnce;
            expect(job._done.args[0][0]).to.deep.equal(new Errors.NotFoundError('test'));
        })
        .finally(function(){
            clearInterval(job.subgraphPoll);
        });
    });

    it('should fail on internal errors with _run() code', function() {
        waterline.nodes.findByIdentifier.rejects(new Error('test'));
        var job = new RunSkuGraphJob({ nodeId: fakeNode.id }, { target: fakeNode.id }, uuid.v4());
        this.sandbox.spy(job, "_done");
        job._run();

        return job._deferred
        .then(function(){
            throw new Error("Test should fail");
        }, function(){
            expect(job._done).to.be.calledOnce;
            expect(job._done.args[0][0]).to.deep.equal(new Error('test'));
        })
        .finally(function(){
            clearInterval(job.subgraphPoll);
        });
    });
});
