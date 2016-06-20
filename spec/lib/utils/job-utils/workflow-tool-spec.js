// Copyright 2016, EMC, Inc.
/* jshint node: true */

'use strict';

describe('JobUtils.WorkflowTool', function() {
    var workflowTool;
    var taskGraphProtocol, taskGraphStore, TaskGraph;
    var Constants, Errors;
    var sandbox;
    var env;

    var graphName = 'test.graph.foo';
    var nodeId = '568f1ff9d78678801234567';
    var graphDomain = 'testDomain';
    var graphInstanceId = '447bb68c-aaaf-4eef-9ed2-c839a72c505d';
    var graphOptions = { defaults: { foo: 'bar' } };
    var proxy = "http://12.1.1.1:8080";
    var testNodeSku = "test node id";

    var waterline = {
        nodes: {
            needByIdentifier: function() {}
        }
    };

    var graphDefinition = {
        injectableName : graphName,
        friendlyName: 'A test graph for unit-test',
        options: {},
        tasks: []
    };
    var graphInstance = {
        instanceId: graphInstanceId,
        _status: "pending",
        persist: function() { return this; }
    };

    before(function() {
        helper.setupInjector(
            _.flattenDeep([
                helper.require('/lib/utils/job-utils/workflow-tool.js'),
                helper.di.simpleWrapper(waterline, 'Services.Waterline'),
                helper.di.simpleWrapper({}, 'Task.taskLibrary')
            ])
        );
        workflowTool = helper.injector.get('JobUtils.WorkflowTool');
        Constants = helper.injector.get('Constants');
        Errors = helper.injector.get('Errors');
        taskGraphProtocol = helper.injector.get('Protocol.TaskGraphRunner');
        taskGraphStore = helper.injector.get('TaskGraph.Store');
        TaskGraph = helper.injector.get('TaskGraph.TaskGraph');
        env = helper.injector.get('Services.Environment');
        waterline = helper.injector.get('Services.Waterline');

        sandbox = sinon.sandbox.create();
    });

    beforeEach(function() {
        sandbox.stub(taskGraphStore, 'findActiveGraphForTarget')
            .withArgs(nodeId).resolves(false);
        sandbox.stub(taskGraphStore, 'getGraphDefinitions')
            .withArgs(graphName).resolves([graphDefinition]);
        sandbox.stub(TaskGraph, 'create').resolves(graphInstance);
        sandbox.stub(taskGraphProtocol, 'runTaskGraph').resolves();
        sandbox.spy(graphInstance, 'persist');
        sandbox.stub(env, 'get').resolves(graphName);
        sandbox.stub(waterline.nodes, 'needByIdentifier')
            .resolves({ id: 'testnodeid', sku: testNodeSku });
    });

    afterEach(function() {
        sandbox.restore();
    });

    describe('runGraph', function() {
        it('should create and run graph if no active graph is running', function() {
            return workflowTool.runGraph(nodeId, graphName, graphOptions, graphDomain)
                .then(function() {
                    expect(taskGraphStore.findActiveGraphForTarget)
                        .to.have.been.calledWith(nodeId);
                    expect(taskGraphStore.getGraphDefinitions)
                        .to.have.been.calledWith(graphName);
                    expect(TaskGraph.create)
                        .to.have.callCount(1)
                        .to.have.been.calledWith(graphDomain,
                            {
                                definition: graphDefinition,
                                options: graphOptions,
                                context: { target: nodeId }
                            }
                        );
                    expect(graphInstance.persist).to.have.callCount(1);
                    expect(taskGraphProtocol.runTaskGraph)
                        .to.have.been.calledWith(graphInstanceId, graphDomain)
                        .to.have.callCount(1);
                    expect(env.get)
                        .to.have.been.calledWith("config." + graphName,graphName,
                            [testNodeSku, Constants.Scope.Global])
                        .to.have.callCount(1);
                    expect(waterline.nodes.needByIdentifier)
                        .to.have.been.calledWith(nodeId)
                        .to.have.callCount(1);
                });
        });

        it('should create and run graph with parent context', function() {
            return workflowTool.runGraph(nodeId, graphName, graphOptions, graphDomain,
                                         null, 'parentGraphId', 'taskId')
                .then(function() {
                    expect(taskGraphStore.findActiveGraphForTarget)
                        .to.have.been.calledWith(nodeId);
                    expect(taskGraphStore.getGraphDefinitions)
                        .to.have.been.calledWith(graphName);
                    expect(TaskGraph.create)
                        .to.have.callCount(1)
                        .to.have.been.calledWith(graphDomain,
                            {
                                definition: graphDefinition,
                                options: graphOptions,
                                context: {
                                  target: nodeId,
                                  _parent: { graphId: 'parentGraphId', taskId: 'taskId' }
                                }
                            }
                        );
                    expect(graphInstance.persist).to.have.callCount(1);
                    expect(taskGraphProtocol.runTaskGraph)
                        .to.have.been.calledWith(graphInstanceId, graphDomain)
                        .to.have.callCount(1);
                });
        });

       it('should create and run graph with a proxy', function() {
            return workflowTool.runGraph(nodeId, graphName, graphOptions, graphDomain, proxy)
                .then(function() {
                    expect(taskGraphStore.findActiveGraphForTarget)
                        .to.have.been.calledWith(nodeId);
                    expect(taskGraphStore.getGraphDefinitions)
                        .to.have.been.calledWith(graphName);
                    expect(TaskGraph.create)
                        .to.have.callCount(1)
                        .to.have.been.calledWith(graphDomain,
                            {
                                definition: graphDefinition,
                                options: graphOptions,
                                context: { target: nodeId, proxy: proxy }
                            }
                        );
                    expect(graphInstance.persist).to.have.callCount(1);
                    expect(taskGraphProtocol.runTaskGraph)
                        .to.have.been.calledWith(graphInstanceId, graphDomain)
                        .to.have.callCount(1);
                });
        });

        it('should call with default domain', function() {
            return workflowTool.runGraph(nodeId, graphName, graphOptions)
                .then(function() {
                    expect(taskGraphStore.findActiveGraphForTarget)
                        .to.have.been.calledWith(nodeId);
                    expect(taskGraphStore.getGraphDefinitions)
                        .to.have.been.calledWith(graphName);
                    expect(TaskGraph.create)
                        .to.have.callCount(1)
                        .to.have.been.calledWith(Constants.Task.DefaultDomain,
                            {
                                definition: graphDefinition,
                                options: graphOptions,
                                context: { target: nodeId }
                            }
                        );
                    expect(graphInstance.persist).to.have.callCount(1);
                    expect(taskGraphProtocol.runTaskGraph)
                        .to.have.been.calledWith(graphInstanceId, Constants.Task.DefaultDomain)
                        .to.have.callCount(1);
                });
        });

        it('should call with default domain and default options', function() {
            return workflowTool.runGraph(nodeId, graphName)
                .then(function() {
                    expect(taskGraphStore.findActiveGraphForTarget)
                        .to.have.been.calledWith(nodeId);
                    expect(taskGraphStore.getGraphDefinitions)
                        .to.have.been.calledWith(graphName);
                    expect(TaskGraph.create)
                        .to.have.been.calledWith(Constants.Task.DefaultDomain,
                            {
                                definition: graphDefinition,
                                options: {},
                                context: { target: nodeId }
                            }
                        ).to.have.callCount(1);
                    expect(graphInstance.persist).to.have.callCount(1);
                    expect(taskGraphProtocol.runTaskGraph)
                        .to.have.been.calledWith(graphInstanceId, Constants.Task.DefaultDomain)
                        .to.have.callCount(1);
                });
        });

        it('should fail if no graphName is specified', function() {
            return expect(workflowTool.runGraph(nodeId))
                .to.be.rejectedWith(Error.AssertionError);
        });

        it('should fail if no nodeId is specified', function() {
            return expect(workflowTool.runGraph(null, graphName))
                .to.be.rejectedWith(Error.AssertionError);
        });

        it('should run with graph name if node sku does not exist', function() {
            waterline.nodes.needByIdentifier = sinon.stub().resolves({ id: 'testnodeid'});
            return workflowTool.runGraph(nodeId, graphName, graphOptions, graphDomain)
                .then(function() {
                    expect(taskGraphStore.getGraphDefinitions)
                        .to.have.been.calledWith(graphName);
                });
        });

        it('should fail if there is active graph is running', function() {
            taskGraphStore.findActiveGraphForTarget.restore();
            sandbox.stub(taskGraphStore, 'findActiveGraphForTarget')
                .withArgs(nodeId).resolves(true);
            return expect(workflowTool.runGraph(nodeId, graphName, graphOptions, graphDomain))
                .to.be.rejectedWith(Error,
                    /Unable to run multiple task graphs against a single target./);
        });

        it('should fail if graph definition doesn\'t exist', function() {
            taskGraphStore.getGraphDefinitions.restore();
            sandbox.stub(taskGraphStore, 'getGraphDefinitions')
                .withArgs(graphName).resolves([]);
            return expect(workflowTool.runGraph(nodeId, graphName, graphOptions, graphDomain))
                .to.be.rejectedWith(Errors.NotFoundError);
        });

        it('should fail if run graph fails', function() {
            taskGraphProtocol.runTaskGraph.restore();
            sandbox.stub(taskGraphProtocol, 'runTaskGraph').rejects();
            return expect(workflowTool.runGraph(nodeId, graphName, graphOptions, graphDomain))
                .to.be.rejected;
        });
    });
});
