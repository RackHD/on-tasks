// Copyright 2015, EMC, Inc.

'use strict';

var di = require('di');

module.exports = runSkuGraphJobFactory;
di.annotate(runSkuGraphJobFactory, new di.Provide('Job.Graph.RunSku'));
    di.annotate(runSkuGraphJobFactory,
    new di.Inject(
        'Job.Graph.Run',
        'Services.Waterline',
        'Logger',
        'Assert',
        'Constants',
        'uuid',
        'Util',
        'Protocol.TaskGraphRunner',
        'Errors',
        'JobUtils.WorkflowTool'
    )
);
function runSkuGraphJobFactory(
    RunGraphJob,
    waterline,
    Logger,
    assert,
    Constants,
    uuid,
    util,
    taskGraphProtocol,
    Errors,
    workflowTool
) {
    var logger = Logger.initialize(runSkuGraphJobFactory);

    /**
     *
     * @param {Object} options
     * @param {Object} context
     * @param {String} taskId
     * @constructor
     */
    function RunSkuGraphJob(options, context, taskId) {
        RunSkuGraphJob.super_.call(this, options, context, taskId);

        this.nodeId = this.options.nodeId;
        assert.string(this.nodeId);
    }
    util.inherits(RunSkuGraphJob, RunGraphJob);

    /**
     * @memberOf RunSkuGraphJob
     */
    RunSkuGraphJob.prototype._run = function() {
        var self = this;

        self.subscribeOwnGraph().then(function(ownGraph) {
            self.subgraphPoll = self.setSubgraphPoll();
            if (!ownGraph) {
                return self.runNodeSkuGraph();
            }
        })
        .catch(function(error) {
            logger.error('fail to run sku specified graph', {
                nodeId: self.nodeId,
                error: error
            });
            self._done(error);
        });
    };

    RunSkuGraphJob.prototype.runNodeSkuGraph = function() {
        var self = this;
        return waterline.nodes.findByIdentifier(self.nodeId)
        .then(function(node) {
            if (!node) {
                self._done(new Error("Node does not exist", {
                    id: self.nodeId
                }));
                return;
            }
            if (!node.sku) {
                // It's okay if there is no SKU, it just means there is
                // nothing to do.
                self._done();
                return;
            }

            return waterline.skus.needOne({ id: node.sku });
        })
        .then(function(sku) {
            var graphName = sku.discoveryGraphName;
            var graphOptions = sku.discoveryGraphOptions || {};
            // If we don't specify the instanceId in the options
            // then we can't track when the graph completes
            graphOptions.instanceId = self.graphId;

            if (!graphName) {
                self._done();
                return;
            }

            return workflowTool.runGraph(
                self.nodeId,
                graphName,
                graphOptions,
                null,
                self.proxy,
                self.parentGraphId,
                self.taskId
            );
        });
    };

    return RunSkuGraphJob;
}
