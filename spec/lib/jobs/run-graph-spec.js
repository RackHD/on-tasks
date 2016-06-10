// Copyright 2015, EMC, Inc.
/* jshint node:true */

'use strict';

describe("Job.Graph.Run", function () {
    var uuid;
    var RunGraphJob;
    var workflowTool;
    var Constants;
    var fakeNode;
    var taskOptions;

    before(function () {
        // create a child injector with on-core and the base pieces we need to test this
        helper.setupInjector([
            helper.require('/spec/mocks/logger.js'),
            helper.require('/lib/jobs/base-job.js'),
            helper.require('/lib/jobs/run-graph.js'),
            helper.require('/lib/task-graph.js'),
            helper.require('/lib/task.js'),
            helper.require('/lib/utils/job-utils/workflow-tool.js'),
            helper.di.simpleWrapper({}, 'Task.taskLibrary')
        ]);

        RunGraphJob = helper.injector.get('Job.Graph.Run');
        workflowTool = helper.injector.get('JobUtils.WorkflowTool');
        Constants = helper.injector.get('Constants');
        uuid = helper.injector.get('uuid');
    });

    beforeEach(function () {
        fakeNode = {
            id: 'bc7dab7e8fb7d6abf8e7d6ab'
        };

        taskOptions = {
            graphName: 'testgraph',
            graphOptions: {
                'option': 'test'
            }
        };

        this.sandbox = sinon.sandbox.create();
        this.sandbox.stub(RunGraphJob.prototype, '_subscribeActiveTaskExists');
        this.sandbox.stub(RunGraphJob.prototype, '_subscribeGraphFinished');
        this.sandbox.stub(workflowTool, 'runGraph').resolves();
    });

    afterEach(function() {
        this.sandbox.restore();
    });

    it('should run a graph', function() {
        var job = new RunGraphJob(taskOptions, {}, uuid.v4());
        job._run();

        expect(job._subscribeGraphFinished).to.have.been.calledOnce;
        var cb = job._subscribeGraphFinished.firstCall.args[0];

        setImmediate(function() {
            cb(Constants.Task.States.Succeeded);
        });

        return job._deferred
        .then(function() {
            expect(workflowTool.runGraph).to.have.been.calledOnce;
            expect(workflowTool.runGraph).to.have.been.calledWith(
                job.graphTarget,
                taskOptions.graphName,
                taskOptions.graphOptions
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
        var proxy = "12.1.1.1";
        var job = new RunGraphJob(taskOptions, {proxy: proxy}, uuid.v4());
        job._run();

        expect(job._subscribeGraphFinished).to.have.been.calledOnce;
        var cb = job._subscribeGraphFinished.firstCall.args[0];

        setImmediate(function() {
            cb(Constants.Task.States.Succeeded);
        });

        return job._deferred
        .then(function() {
            expect(workflowTool.runGraph).to.have.been.calledOnce;
            expect(workflowTool.runGraph).to.have.been.calledWith(
                job.graphTarget,
                taskOptions.graphName,
                taskOptions.graphOptions,
                Constants.Task.DefaultDomain,
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

    it('should run a graph against a target (nodeId)', function() {
        taskOptions.graphOptions.target = 'testnodeid';

        var job = new RunGraphJob(taskOptions, {}, uuid.v4());
        job._run();

        expect(job.graphTarget).to.equal(taskOptions.graphOptions.target);

        expect(job._subscribeGraphFinished).to.have.been.calledOnce;
        var cb = job._subscribeGraphFinished.firstCall.args[0];

        setImmediate(function() {
            cb(Constants.Task.States.Succeeded);
        });

        return job._deferred
        .then(function() {
            expect(workflowTool.runGraph).to.have.been.calledOnce;
            expect(workflowTool.runGraph).to.have.been.calledWith(
                'testnodeid',
                taskOptions.graphName,
                taskOptions.graphOptions
            );
        });
    });

    it('should fail on a failed graph', function() {
        var job = new RunGraphJob(taskOptions, {}, uuid.v4());
        job._run();

        expect(job._subscribeGraphFinished).to.have.been.calledOnce;
        var cb = job._subscribeGraphFinished.firstCall.args[0];

        setImmediate(function() {
            cb(Constants.Task.States.Failed);
        });

        return expect(job._deferred).to.be.rejectedWith(/Graph.*failed with status/);
    });

    it('should fail on internal errors with _run() code', function() {
        workflowTool.runGraph.rejects(new Error('test'));

        var job = new RunGraphJob(taskOptions, {}, uuid.v4());
        job._run();

        return expect(job._deferred).to.be.rejectedWith('test');
    });
});
