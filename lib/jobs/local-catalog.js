// Copyright 2015, EMC, Inc.

'use strict';

var di = require('di');

module.exports = LocalCatalogJobFactory;
di.annotate(LocalCatalogJobFactory, new di.Provide('Job.Local.Catalog'));
    di.annotate(LocalCatalogJobFactory,
    new di.Inject(
        'Job.Base',
        'JobUtils.CommandParser',
        'Services.Waterline',
        'Logger',
        'Promise',
        'Assert',
        'Util',
        '_',
        'Services.Encryption',
        'ChildProcess'
    )
);
function LocalCatalogJobFactory(
    BaseJob,
    parser,
    waterline,
    Logger,
    Promise,
    assert,
    util,
    _,
    encryption,
    ChildProcess
) {
    var logger = Logger.initialize(LocalCatalogJobFactory);

    /**
     * @param {Object} options
     * @param {Object} context
     * @param {String} taskId
     * @constructor
     */
    function LocalCatalogJob(options, context, taskId) {
        LocalCatalogJob.super_.call(this,
                                   logger,
                                   options,
                                   context,
                                   taskId);

        assert.string(this.context.target);
        assert.arrayOfString(this.options.commands);

        this.childProcess = undefined;
        this.nodeId = this.context.target;
        this.commands = _.isArray(options.commands) ? options.commands : [options.commands];
    }
    util.inherits(LocalCatalogJob, BaseJob);

    /**
     * @memberOf LocalCatalogJob
     */
    LocalCatalogJob.prototype._run = function() {
        var self = this;

        waterline.nodes.findByIdentifier(self.nodeId)
        .then(function (node) {
            assert.ok(node, 'No node for local catalog');
            return Promise.map(self.commands, function(cmd) {
                return parser.validateParser(cmd)
                .then(function() {
                    return self.runCommand(cmd);
                })
                .catch(function(err) {
                    logger.error("Error running local catalog", { command: cmd, error: err });
                });
            });
        })
        .then(self.handleResponse.bind(self))
        .then(function() {
            self.childProcess = undefined;
            self._done();
        })
        .catch(function(err) {
            self.childProcess = undefined;
            self._done(err);
        });
    };

    /**
     * @memberOf LocalCatalogJob
     */
    LocalCatalogJob.prototype.runCommand = function (cmd) {
        var self = this;
        var args = cmd.split(' ');
        var program = args[0];
        if(program === "sudo") {
            program = args[1];
            args.shift();
        }
        args.shift();
        return Promise.resolve()
        .then(function() {
            var env = {
                'nodeid': self.nodeId
            };
            self.childProcess = new ChildProcess(program, args, env);

            logger.debug("Sending command to node.", {
                command: cmd,
                nodeId: self.nodeId
            });

            return self.childProcess.run({ retries: 0, delay: 0 });
        })
        .then(function(ret) {
            ret.cmd = cmd;
            if (ret.stderr) {
                ret.error = 1;
            }
            logger.debug("Received respond from node.", {
                nodeId: self.nodeId,
                error: ret.error
            });
            return ret;
        })
        .catch(function(err) {
            logger.error("Error running command", {
                command: cmd,
                error: err
            });
        });
    };

    /**
     * @memberOf LocalCatalogJob
     */
    LocalCatalogJob.prototype.handleResponse = function(result) {
        var self = this;

        return parser.parseTasks(result)
        .spread(function() {
            var addCatalogPromises = [];
            var lookupPromises = [];

            _.forEach(arguments, function(result) {
                if (result.error) {
                    logger.error("Failed to parse data for " + result.source, {
                        error: result.error,
                        result: result
                    });
                } else {
                    if (result.store) {
                        addCatalogPromises.push(
                            Promise.resolve(waterline.catalogs.create({
                                node: self.nodeId,
                                source: result.source,
                                data: result.data
                            }))
                        );
                    } else {
                        logger.debug("Catalog result for " + result.source +
                            " has not been marked as significant. Not storing.");
                    }
                }
            });

            return [addCatalogPromises, lookupPromises];
        }).catch(function(err) {
            logger.error("Job error processing catalog output.", {
                error: err,
                id: self.nodeId,
                taskContext: self.context
            });
        });
    };

    /**
     * @memberOf LocalCatalogJob
     */
     LocalCatalogJob.prototype._cleanup = function cleanup() {
        var self = this;
        if(self.childProcess) {
            self.childProcess.killSafe();
        }
    };

    return LocalCatalogJob;
}
