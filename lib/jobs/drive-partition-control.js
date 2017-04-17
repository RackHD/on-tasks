// Copyright 2015, EMC, Inc.
/* jshint: node:true */

'use strict';

var di = require('di');

module.exports = drivePartitionJobFactory;
di.annotate(drivePartitionJobFactory, new di.Provide('Job.Drive.Partition.Control'));
    di.annotate(drivePartitionJobFactory,
    new di.Inject(
        'Job.Base',
        'Logger',
        'Promise',
        'Assert',
        'Util',
        '_'
    )
);

function drivePartitionJobFactory(
    BaseJob,
    Logger,
    Promise,
    assert,
    util,
    _)
{
    var logger = Logger.initialize(drivePartitionJobFactory);

    /**
     * @param {Object} options
     * @param {Object} context
     * @param {String} taskId
     * @constructor
     */
    function DrivePartitionJob(options, context, taskId) {
        DrivePartitionJob.super_.call(this, logger, options, context, taskId);

        assert.string(this.context.target);
        assert.string(this.options.action);
        this.nodeId = this.context.target;
    }
    util.inherits(DrivePartitionJob, BaseJob);

    /**
     * Find the action handle function for specified action
     * @param {String} actionName - The action
     * @return {Function} The action handle function
     */
    DrivePartitionJob.prototype._findActionHandle = function(actionName) {
        var funcName = actionName + 'Handle';
        var handleFunc = this[funcName];
        if (!handleFunc) {
            return function() {};
        }
        if (!_.isFunction(handleFunc)) {
            throw(new Error('The handling for partition ' + actionName + ' is not callable.'));
        }
        return handleFunc;
    };

    /**
     * Build the commands for disk partition control
     * @return {Array} The array contains the full format command of partition control using
     * the tool 'parted'
     */
    DrivePartitionJob.prototype._buildCommands = function() {
        var self = this;
        if (self.options.action === 'clear') {
            var type = self.options.partitionType || 'gpt';
            return self.options.driveIds.map(function(id) {
                return {
                    cmd: 'sudo parted -s ' + id + ' mklabel ' + type
                };
            });
        }
    };

    /**
     * The function the parse the output of tool 'parted', to judge whether the parted does job
     * successfully or failed.
     *
     * For the 'parted' tool, if command execution success, the command output is empty. So if the
     * command output is emtpy, it means the command runs successfully, otherwise failed.
     *
     * @param {String} commandOutput - The stdout of parted command execution.
     * @return {Object} The returned object contains two properties 'error', 'data'; the 'error'
     * indicates whether the command execution has failure (by judging the command output), the
     * 'data' is optional, it contains the parsed or re-formated data.
     */
    DrivePartitionJob.prototype._outputParser = function(commandOutput) {
       var failed = (commandOutput !== '');
        return {
            error: failed
        };
    };

    /**
     * The function to handle partition clearing.
     * @return {Promise}
     */
    DrivePartitionJob.prototype.clearHandle = function() {
        return this.runRemoteCommand(this._buildCommands(), this._outputParser);
    };

    /**
     * Handle the response data from node
     * @param {Array} data - The response data from node for each commands.
     * @param {Function} parser - The function to parse the each command output.
     * @return {Object}
     */
    DrivePartitionJob.prototype.handleResponse = function(data, parser) {
        var self = this;
        var parsedResult = [];
        var failed = _.some(data.tasks, function(task) {
            if (task.error) {
                logger.error('Fail to run command on node.', {
                    nodeId: self.nodeId,
                    responseObject: task
                });
                return true;
            }
            if (parser) {
                var result = parser.call(null, task.stdout);
                if (result.error) {
                    logger.error('The parser tells command execution has failure on node.', {
                        nodeId: self.nodeId,
                        responseObject: task
                    });
                    return true;
                }
                parsedResult.push(result);
            }
            else {
                parsedResult.push(task.stdout);
            }
            return false;
        });

        if (failed) {
            return { error: true };
        }
        else {
            return { error: false, data: parsedResult };
        }
    };

    /**
     * The common function to remotely run commands in microkernel and handle its response,
     * This function is wrapped as Promise
     * @param {Array} cmds - Array of String, the batched commands that need be executed
     * @param {Function} [parser] - The function to parse the command response, this can be omitted.
     * @param {Integer} [timeout] - The timeout (in milliseconds) to wait the command response,
     * default is 60 sec.
     * @return {Promise}
     */
    DrivePartitionJob.prototype.runRemoteCommand = function(cmds, parser, timeout) {
        var self = this;
        timeout = timeout || 60*1000; //default set 1 min as timeout
        return new Promise(function(resolve, reject) {
            self._subscribeRequestCommands(function() {
                logger.debug("Received command request from node. Sending commands.", {
                    nodeId: self.nodeId,
                    commands: cmds
                });
                return {
                    identifier: self.nodeId,
                    tasks: cmds
                };
            });

             self._subscribeRespondCommands(function(data) {
                var result = self.handleResponse(data, parser);
                if (result.error) {
                    reject(new Error('The command response shows some error'));
                }
                else {
                    resolve(result.data);
                }
            });
        }).timeout(timeout, 'Timeout to wait for the node response');
    };

    /**
     * @memberOf DrivePartitionJob
     * @function
     * @return {Promise}
     */
    DrivePartitionJob.prototype._run = function() {
        var self = this;

        // Called if this job is used to render a script template
        self._subscribeRequestProperties(function() {
            return self.options;
        });

        //if not disks are specified, then do nothing
        if (!self.options.driveIds || self.options.driveIds.length === 0) {
            logger.debug('no driveIds is specified, so ignore drive partition operation.');
            self._done();
            return Promise.resolve();
        }

        return Promise.resolve().then(function() {
            var handle = self._findActionHandle(self.options.action);
            return handle.call(self);
        }).then(function() {
            self._done();
        }).catch(function(err) {
            self._done(err);
            logger.error('fail to complete drive partition control job', {
                error: err,
                action: self.options.action,
                nodeId: self.nodeId,
                context: self.context
            });
        });
    };

    return DrivePartitionJob;
}
