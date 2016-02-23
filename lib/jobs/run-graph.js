// Copyright 2015, EMC, Inc.

'use strict';

var di = require('di');

module.exports = runGraphJobFactory;
di.annotate(runGraphJobFactory, new di.Provide('Job.Graph.Run'));
    di.annotate(runGraphJobFactory,
    new di.Inject(
        'Job.Base',
        'Protocol.TaskGraphRunner',
        'TaskGraph.TaskGraph',
        'TaskGraph.Store',
        'Services.Waterline',
        'Constants',
        'Logger',
        'Assert',
        'uuid',
        'Util',
        'Promise',
        '_'
    )
);
function runGraphJobFactory(
    BaseJob,
    taskGraphProtocol,
    TaskGraph,
    taskGraphStore,
    waterline,
    Constants,
    Logger,
    assert,
    uuid,
    util
) {
    var logger = Logger.initialize(runGraphJobFactory);

    /**
     *
     * @param {Object} options
     * @param {Object} context
     * @param {String} taskId
     * @constructor
     */
    function RunGraphJob(options, context, taskId) {
        RunGraphJob.super_.call(this, logger, options, context, taskId);

        assert.string(this.options.graphName);
        assert.object(this.options.graphOptions);
        // context.target is optional depending on what graph is being run
        assert.object(context);

        if (!this.options.instanceId) {
            this.options.instanceId = uuid.v4();
        }
        this.graphId = this.options.instanceId;
        this.options.graphOptions.instanceId = this.graphId;
        this.graphTarget = this.options.graphOptions.target;
        this.domain = this.options.domain || Constants.Task.DefaultDomain;
    }
    util.inherits(RunGraphJob, BaseJob);

    /**
     * @memberOf RunGraphJob
     */
    RunGraphJob.prototype._run = function() {
        var self = this;

        this._subscribeGraphFinished(function(status) {
            assert.string(status);
            if (status === Constants.Task.States.Succeeded) {
                self._done();
            } else {
                self._done(new Error("Graph " + self.graphId + " failed with status " + status));
            }
        });

        taskGraphStore.findActiveGraphForTarget(self.graphTarget)
        .then(function(activeGraph) {
            if (activeGraph) {
                throw new Error("Unable to run multiple task graphs against a single target.");
            }
            return waterline.graphdefinitions.needOne({ injectableName: self.options.graphName });
        })
        .then(function(definition) {
            return TaskGraph.create(self.domain, {
                definition: definition.toJSON(),
                options: self.options.graphOptions,
                context: { target: self.graphTarget }
            });
        })
        .then(function(graph) {
            return graph.persist();
        })
        .then(function(graph) {
            return taskGraphProtocol.runTaskGraph(graph.instanceId, self.domain);
        })
        .catch(function(error) {
            logger.error("Error starting graph for task.", {
                taskId: self.taskId,
                graphName: self.options.graphName,
                error: error
            });
            self._done(error);
        });
    };

    return RunGraphJob;
}
