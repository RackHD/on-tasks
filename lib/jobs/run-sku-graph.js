// Copyright 2015, EMC, Inc.

'use strict';

var di = require('di');

module.exports = runSkuGraphJobFactory;
di.annotate(runSkuGraphJobFactory, new di.Provide('Job.Graph.RunSku'));
    di.annotate(runSkuGraphJobFactory,
    new di.Inject(
        'Job.Base',
        'Services.Waterline',
        'Protocol.TaskGraphRunner',
        'Logger',
        'Assert',
        'uuid',
        'Util',
        'JobUtils.WorkflowTool'
    )
);
function runSkuGraphJobFactory(
    BaseJob,
    waterline,
    taskGraphProtocol,
    Logger,
    assert,
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
        assert.isMongoId(this.nodeId);

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
            assert.string(status);
            if (status === 'succeeded') {
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
                self._done();
                return;
            }

            return waterline.skus.findOne({ id: node.sku })
            .then(function(sku) {
                if (!sku) {
                    return;
                }
                var graphName = sku.discoveryGraphName;
                var graphOptions = sku.discoveryGraphOptions || {};

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
