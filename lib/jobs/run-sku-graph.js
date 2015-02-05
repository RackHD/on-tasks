// Copyright 2014-2015, Renasar Technologies Inc.
/* jshint: node:true */

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
        'Q',
        '_'
    )
);
function runSkuGraphJobFactory(BaseJob, waterline, taskGraphProtocol, Logger, assert, uuid, util) {
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

        logger.info("Running run-graph job.", {
            options: self.options,
            context: self.context,
            taskId: self.taskId
        });

        this._subscribeGraphFinished(function(status) {
            assert.string(status);
            if (status === 'succeeded') {
                self._done();
            } else {
                self._done(new Error("Graph " + self.graphId +
                        " failed with status " + status));
            }
        });


        waterline.nodes.findByIdentifier(this.nodeId).populate('sku')
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

            var graphName = node.sku.discoveryGraphName;
            var graphOptions = node.sku.discoveryGraphOptions || {};

            if (!graphName) {
                self._done();
                return;
            }

            return taskGraphProtocol.runTaskGraph(
                    graphName,
                    graphOptions,
                    self.nodeId)
            .then(function(message) {
                assert.uuid(message);
            });
        })
        .catch(function(error) {
            self._done(error);
        });
    };

    return RunSkuGraphJob;
}
