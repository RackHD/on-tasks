// Copyright 2016, EMC, Inc.

'use strict';

var di = require('di');

module.exports = workflowToolFactory;

di.annotate(workflowToolFactory, new di.Provide('JobUtils.WorkflowTool'));
di.annotate(workflowToolFactory, new di.Inject(
    'Protocol.TaskGraphRunner',
    'TaskGraph.TaskGraph',
    'TaskGraph.Store',
    'Services.Waterline',
    'Constants',
    'Errors',
    'Assert',
    '_',
    'Promise',
    'Services.Environment'
));

function workflowToolFactory(
    taskGraphProtocol,
    TaskGraph,
    taskGraphStore,
    waterline,
    Constants,
    Errors,
    assert,
    _,
    Promise,
    env
) {
    function WorkflowTool() {}

    /**
     * Run graph by injectableName
     *
     * @param {String} nodeId - The node identifier that the graph will run against
     * @param {String} graphName - The injectableName of graph
     * @param {Object} options - The graph options
     * @param {String} domain - The domain of the target graph
     * @param {String} proxy - Context proxy
     * @param {String} graphId - Context graphId
     * @param {String} taskId - Context taskId
     * @return {Promise}
     */
    WorkflowTool.prototype.runGraph = function(nodeId, graphName, options, domain,
                                               proxy, parentGraphId, taskId) {
        var graphOptions = options || {};
        var graphDomain = domain || Constants.Task.DefaultDomain;
        return Promise.resolve()
            .then(function() {
                assert.string(nodeId);
                assert.string(graphName);
                return taskGraphStore.findActiveGraphForTarget(nodeId);
            })
            .then(function(activeGraph) {
                if (activeGraph) {
                    throw new Error('Unable to run multiple task graphs against a single target.');
                }
                return waterline.nodes.needByIdentifier(nodeId)
                    .then(function(node) {
                        if(node.sku) {
                            return env.get("config." + graphName, graphName,
                                [node.sku,  Constants.Scope.Global]);
                        }
                        return graphName;
                    }).then(function(name) {
                        return taskGraphStore.getGraphDefinitions(name);
                    });
            })
            .then(function(definitions) {
                if (_.isEmpty(definitions)) {
                    throw new Errors.NotFoundError('Fail to find graph definition for ' +
                        graphName);
                }
                var context = { target: nodeId };
                if (proxy) {
                    context.proxy = proxy;
                }
                return TaskGraph.create(graphDomain, {
                    definition: definitions[0],
                    options: graphOptions,
                    context: context
                });
            })
            .then(function(graph) {
                graph.parentGraphId = parentGraphId;
                graph.parentTaskId = taskId;
                if (graph._status === Constants.Task.States.Pending) {
                    graph._status = Constants.Task.States.Running;
                }
                return graph.persist();
            })
            .then(function(graph) {
                return taskGraphProtocol.runTaskGraph(graph.instanceId, graphDomain);
            });
    };

    return new WorkflowTool();
}
