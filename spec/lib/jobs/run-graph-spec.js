// Copyright 2015, EMC, Inc.  /* jshint node:true */

'use strict';

describe("Job.Graph.Run", function () {
    var uuid;
    var RunGraphJob;
    var workflowTool;
    var Errors;
    var Constants;
    var fakeNode;
    var taskOptions;
    var taskGraphProtocol = {};
    var taskGraphStore = {};

    before(function () {
        // create a child injector with on-core and the base pieces we need to test this
        helper.setupInjector([
            helper.require('/spec/mocks/logger.js'),
            helper.require('/lib/jobs/base-job.js'),
            helper.require('/lib/jobs/run-graph.js'),
            helper.require('/lib/task-graph.js'),
            helper.require('/lib/task.js'),
            helper.require('/lib/utils/job-utils/workflow-tool.js'),
            helper.require('/lib/utils/task-option-validator.js'),
            helper.di.simpleWrapper({}, 'Task.taskLibrary'),
            helper.di.simpleWrapper(taskGraphStore, 'TaskGraph.Store'),
            helper.di.simpleWrapper(taskGraphProtocol, 'Protocol.TaskGraphRunner')
        ]);

        RunGraphJob = helper.injector.get('Job.Graph.Run');
        workflowTool = helper.injector.get('JobUtils.WorkflowTool');
        Errors = helper.injector.get('Errors');
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
        taskGraphStore.findChildGraph = this.sandbox.stub().resolves();
        taskGraphProtocol.cancelTaskGraph = this.sandbox.stub().resolves();
    });

    afterEach(function() {
        this.sandbox.restore();
    });

    it('should run a graph', function() {
        var job = new RunGraphJob(taskOptions, {}, uuid.v4());
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

        setImmediate(function() {
            job.finishWithState(Constants.Task.States.Succeeded);
        });

        return job._deferred
        .then(function() {
            expect(job._subscribeGraphFinished).to.have.been.calledOnce;
            expect(job._subscribeGraphFinished).to.have.been.calledWith(
                job.finishWithState
            );
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

        setImmediate(function() {
            job.finishWithState(Constants.Task.States.Succeeded);
        });

        return job._deferred
        .then(function() {
            expect(job._subscribeGraphFinished).to.have.been.calledOnce;
            expect(job._subscribeGraphFinished).to.have.been.calledWith(
                job.finishWithState
            );
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
        this.sandbox.spy(job, 'setSubgraphPoll');
        this.sandbox.spy(job, '_done');
        setImmediate(function() {
            job.finishWithState(Constants.Task.States.Failed);
        });
        return job._deferred
        .then(function(){
            throw new Error("Test should fail");
        }, function(){
            expect(job.setSubgraphPoll).to.be.calledOnce;
            expect(taskGraphStore.findChildGraph).to.be.calledOnce;
            expect(job._subscribeGraphFinished).to.be.calledOnce;
            expect(job._done).to.be.calledOnce;
            expect(job._done.args[0][0]).to.deep.equal(new Error(
                "Graph undefined failed with status Failed"
            ));
        })
        .finally(function(){
            clearInterval(job.subgraphPoll);
        });
    });

    it('should fail on internal errors with _run() code', function() {
        workflowTool.runGraph.rejects(new Error('test'));

        var job = new RunGraphJob(taskOptions, {}, uuid.v4());
        this.sandbox.spy(job, '_done');
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

    it('should subscribeGraphFinished before running a new graph', function() {
        var job = new RunGraphJob(taskOptions, {}, uuid.v4());
        workflowTool.runGraph.restore();
        this.sandbox.stub(workflowTool, 'runGraph', function() {
            expect(job._subscribeGraphFinished).to.be.calledOnce;
            expect(job._subscribeGraphFinished).to.be.calledWith(
                job.finishWithState
            );
            return Promise.resolve();
        });
        job._run();

        setImmediate(function() {
            job.finishWithState(Constants.Task.States.Succeeded);
        });

        return job._deferred
        .then(function() {
            expect(workflowTool.runGraph).to.have.been.calledOnce;
        });
    });

    it('should not run a subgraph if one already exists', function() {
        var job = new RunGraphJob(taskOptions, {}, uuid.v4());
        taskGraphStore.findChildGraph.resolves(
            {
                instanceId: 'some graphId',
                context: {graphId: 'the graphId'},
                name: 'fake test graph'
            }
        );
        job._run();

        setImmediate(function() {
            job.finishWithState(Constants.Task.States.Succeeded);
        });

        return job._deferred
        .then(function() {
            expect(taskGraphStore.findChildGraph).to.be.calledOnce;
            expect(taskGraphStore.findChildGraph).to.be.calledWith(job.taskId);
            expect(workflowTool.runGraph).to.not.have.been.called;
        });
    });

    it('should poll the subgraph and finish if the subgraph is finished', function() {
        var finishedGraph = {
                instanceId: 'some graphId',
                context: {graphId: 'the graphId'},
                name: 'fake test graph',
                _status: Constants.Task.States.Succeeded
        };
        taskGraphStore.findChildGraph.onCall(4).resolves(finishedGraph);

        taskOptions.graphPollInterval = 1; // one millisecond
        var job = new RunGraphJob(taskOptions, {}, uuid.v4());
        job._run();

        return job._deferred
        .then(function() {
            taskGraphStore.findChildGraph.args.slice(1).forEach(function(arg) {
                expect(arg[0]).to.deep.equal(job.taskId);
            });
        });
    });

    it('should cancel a subgraph in cleanup if it is cancelled', function() {
        var job = new RunGraphJob(taskOptions, {}, uuid.v4());
        setImmediate(function() {
            job.cancel(new Errors.TaskCancellationError());
        });

        return job.run()
        .catch(function() {
            expect(taskGraphProtocol.cancelTaskGraph).to.have.been.calledOnce;
            expect(taskGraphProtocol.cancelTaskGraph).to.have.been.calledWith(job.graphId);
            clearInterval(job.subgraphPoll);
        });
    });
});
