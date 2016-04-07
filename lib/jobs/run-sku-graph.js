// Copyright 2015, EMC, Inc.

'use strict';

var di = require('di');

module.exports = runSkuGraphJobFactory;
di.annotate(runSkuGraphJobFactory, new di.Provide('Job.Graph.RunSku'));
    di.annotate(runSkuGraphJobFactory,
    new di.Inject(
        'Job.Base',
        'Services.Waterline',
        'Logger',
        'Assert',
        'Constants',
        'uuid',
        'Util',
        'JobUtils.WorkflowTool'
    )
);
function runSkuGraphJobFactory(
    BaseJob,
    waterline,
    Logger,
    assert,
    Constants,
    uuid,
    util,
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
        RunSkuGraphJob.super_.call(this, logger, options, context, taskId);

        this.nodeId = this.options.nodeId;
        assert.string(this.nodeId);

        if (!this.options.instanceId) {
            this.options.instanceId = uuid.v4();
        }
        this.graphId = this.options.instanceId;
    }
    util.inherits(RunSkuGraphJob, BaseJob);

    /**
     * @memberOf RunSkuGraphJob
     */
    RunSkuGraphJob.prototype._run = function() {
        var self = this;

        this._subscribeGraphFinished(function(status) {
            if (status === Constants.Task.States.Succeeded) {
                self._done();
            } else {
                self._done(new Error("Graph " + self.graphId +
                        " failed with status " + status));
            }
        });


        waterline.nodes.findByIdentifier(this.nodeId)
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

            return waterline.skus.needOne({ id: node.sku })
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
                    graphOptions
                );
            });
        })
        .catch(function(error) {
            logger.error('fail to run sku specified graph', {
                nodeId: self.nodeId,
                error: error
            });
            self._done(error);
        });
    };

    return RunSkuGraphJob;
}
