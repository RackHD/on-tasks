// Copyright 2015, EMC, Inc.

'use strict';

var di = require('di');

module.exports = runSkuGraphJobFactory;
di.annotate(runSkuGraphJobFactory, new di.Provide('Job.Graph.RunSku'));
    di.annotate(runSkuGraphJobFactory,
    new di.Inject(
        'Job.Base',
        'Services.Waterline',
        'Services.Environment',
        'Logger',
        'Assert',
        'Constants',
        'uuid',
        'Util',
        'JobUtils.WorkflowTool',
        '_'
    )
);
function runSkuGraphJobFactory(
    BaseJob,
    waterline,
    env,
    Logger,
    assert,
    Constants,
    uuid,
    util,
    workflowTool,
    _
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
     * Find the SKU graph info from env or sku document
     *
     * The graph info in SKU pack will take precedence, the graph info in sku docuemnt will still
     * be supported but this is marked as deprecated behavior.
     *
     * @param {Object} node - the node document
     * @return {Promise}
     * @memberOf RunSkuGraphJob
     */
    RunSkuGraphJob.prototype._findSkuGraphInfo = function(node) {
        //Below line works for both sku & non-sku cases
        //if node.sku doesn't exist, then _.compact will omit it from scope, then the env will only
        //lookup the global scope
        return env.get('config', {}, _.compact([ node.sku, Constants.Scope.Global ]))
        .then(function(config) {
            //The graph info in env will take precedence
            if (config.hasOwnProperty('postDiscoveryGraph')) {
                return config.postDiscoveryGraph;
            }

            // It's okay if there is no SKU, it just means there is nothing to do.
            if (!node.sku) {
                return;
            }

            //if no graph in env, then lookup the sku document, but this is deprecated
            return waterline.skus.needOne({ id: node.sku })
            .then(function(sku) {
                if (sku.discoveryGraphName) {
                    logger.deprecate('SKU specified graph has moved into skupack!');
                    return {
                        name: sku.discoveryGraphName,
                        options: sku.discoveryGraphOptions
                    };
                }
            });
        });
    };

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

            return self._findSkuGraphInfo(node)
            .then(function(graphInfo) {
                if (!graphInfo || !graphInfo.name) {
                    self._done();
                    return;
                }

                // If we don't specify the instanceId in the options
                // then we can't track when the graph completes
                graphInfo.options = _.merge(graphInfo.options, { instanceId: self.graphId });

                logger.debug('run sku specified graph', {
                    nodeId: self.nodeId,
                    graphName: graphInfo.name,
                    graphOptions: graphInfo.options
                });

                return workflowTool.runGraph(
                    self.nodeId,
                    graphInfo.name,
                    graphInfo.options
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
