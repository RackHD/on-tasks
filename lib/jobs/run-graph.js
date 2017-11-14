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
        'Constants',
        'Logger',
        'Assert',
        'uuid',
        'Util',
        'JobUtils.WorkflowTool',
        '_',
        'Errors'
    )
);
function runGraphJobFactory(
    BaseJob,
    taskGraphProtocol,
    TaskGraph,
    taskGraphStore,
    Constants,
    Logger,
    assert,
    uuid,
    util,
    workflowTool,
    _,
    Errors
) {
    var logger = Logger.initialize(runGraphJobFactory);

    /**
     *
     * @param {Object} options
     * @param {Object} context
     * @param {String} taskId
     * @constructor
     */
    function RunGraphJob(options, context, taskId, taskName,  _logger) {
        RunGraphJob.super_.call(this, _logger || logger, options, context, taskId);

        if (!this.options.instanceId) {
            this.options.instanceId = uuid.v4();
        }

        this.graphId = this.options.instanceId;
        this.parentGraphId = this.context.graphId;
        this.proxy = context.proxy;
        this.graphPollInterval = this.options.graphPollInterval || 10000;

        if(this.constructor.name === 'RunGraphJob') {
            //only do these things for this class and not its subclasses
            assert.string(this.options.graphName);
            assert.object(this.options.graphOptions);
            this.options.graphOptions.instanceId = this.graphId;
            this.graphTarget = this.options.graphOptions.target;
            this.domain = this.options.domain || Constants.Task.DefaultDomain;
        }
    }
    util.inherits(RunGraphJob, BaseJob);


    /**
     * @memberOf RunGraphJob
     */
    RunGraphJob.prototype._run = function() {
        var self = this;
        self.subscribeOwnGraph().then(function(ownGraph) {
            self.subgraphPoll = self.setSubgraphPoll();
            if (!ownGraph) {
                return workflowTool.runGraph(
                    self.graphTarget,
                    self.options.graphName,
                    self.options.graphOptions,
                    self.domain,
                    self.proxy,
                    self.parentGraphId,
                    self.taskId
                );
            }
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

    RunGraphJob.prototype.finishWithState = function(subGraphStatus) {
        if (subGraphStatus === Constants.Task.States.Succeeded) {
            if (this.subgraphPoll) {
                clearInterval(this.subgraphPoll);
            }
            this._done();
        } else if (_.contains(Constants.Task.FailedStates, subGraphStatus)) {
            this._done(new Error(
                "Graph " + this.graphId + " failed with status " + subGraphStatus)
            );
        }
    };

    RunGraphJob.prototype.subscribeOwnGraph = function() {
        var self = this;
        return taskGraphStore.findChildGraph(self.taskId)
        .then(function(ownGraph) {
            if(ownGraph) {
                self.graphId = ownGraph.context.graphId;
            }
            self._subscribeGraphFinished(self.finishWithState);
            return ownGraph;
        });
    };

   RunGraphJob.prototype.setSubgraphPoll = function() {
        var self = this;
        return setInterval(function() {
            taskGraphStore.findChildGraph(self.taskId)
            .then(function(graph) {
                if (graph) {
                    self.finishWithState(graph._status);
                }
            });
        }, self.graphPollInterval);
   };

    RunGraphJob.prototype._cleanup = function() {
        if (this._deferred._settledValue instanceof Errors.TaskCancellationError) {
            return taskGraphProtocol.cancelTaskGraph(this.graphId);
        } else {
            return Promise.resolve();
        }
    };

    return RunGraphJob;
}
