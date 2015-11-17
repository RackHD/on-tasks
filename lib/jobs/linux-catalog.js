// Copyright 2015, EMC, Inc.

'use strict';

var di = require('di');

module.exports = catalogJobFactory;
di.annotate(catalogJobFactory, new di.Provide('Job.Linux.Catalog'));
    di.annotate(catalogJobFactory,
    new di.Inject(
        'Job.Base',
        'JobUtils.CommandParser',
        'Services.Waterline',
        'Services.Lookup',
        'Logger',
        'Assert',
        'Util',
        'Promise',
        '_'
    )
);
function catalogJobFactory(BaseJob, parser, waterline, lookup, Logger, assert, util, Promise, _) {
    var logger = Logger.initialize(catalogJobFactory);

    /**
     *
     * @param {Object} options
     * @param {Object} context
     * @param {String} taskId
     * @constructor
     */
    function CatalogJob(options, context, taskId) {
        CatalogJob.super_.call(this, logger, options, context, taskId);

        assert.string(this.context.target);
        this.nodeId = this.context.target;

        this.commands = this.buildCommands(options.commands);
        assert.arrayOfObject(this.commands);
    }
    util.inherits(CatalogJob, BaseJob);

    /**
     * @memberOf CatalogJob
     */
    CatalogJob.prototype._run = function() {
        var self = this;

        this._subscribeRequestCommands(function() {
            logger.debug("Received command request from node. Sending commands.", {
                id: self.nodeId,
                commands: self.commands
            });
            return {
                identifier: this.nodeId,
                tasks: self.commands
            };
        });

        this._subscribeRespondCommands(function(data) {
            logger.debug("Received command payload from node.", {
                id: self.nodeId
            });

            parser.parseTasks(data.tasks)
            .spread(function() {
                var addCatalogPromises = [];
                var lookupPromises = [];

                _.forEach(arguments, function(result) {
                    if (result.error) {
                        logger.error("Failed to parse data for " + result.source, {
                            error: result.error,
                            result: result,
                        });
                    } else {
                        _.forEach(result.lookups, function(lookupEntry) {
                            if (lookupEntry.mac && lookupEntry.ip) {
                                lookupPromises.push(
                                    lookup.setIpAddress(lookupEntry.ip, lookupEntry.mac)
                                );
                            } else if (lookupEntry.mac) {
                                lookupPromises.push(
                                    waterline.lookups.upsertNodeToMacAddress(
                                        self.nodeId, lookupEntry.mac)
                                );
                            }
                        });
                        if (result.store) {
                            addCatalogPromises.push(
                                // Promisify the waterline 'when' promise so
                                // we can call spread on it
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
            }).spread(function() {
                self._done();
            }).catch(function(err) {
                logger.error("Job error processing catalog output.", {
                    error: err,
                    id: self.nodeId,
                    taskContext: self.context
                });
                self._done(err);
            });
        });
    };

    /**
     * Transforms the command option json from a task definition to a json schema
     * consumed by the bootstrap.js task runner
     *
     * @example
     * Sample input:
     *  [
     *      'sudo dmidecode',
     *      {
     *          command: 'sudo bash get_smart.sh',
     *          downloadUrl: '/api/1.1/templates/get_smart.sh'
     *      }
     *  ]
     *
     * Sample output:
     *  [
     *      {
     *          cmd: 'sudo dmidecode'
     *      },
     *      {
     *          cmd: 'sudo bash get_smart.sh',
     *          downloadUrl: '/api/1.1/templates/get_smart.sh'
     *      }
     *  ]
     *
     * @memberOf CatalogJob
     * @function
     */
    CatalogJob.prototype.buildCommands = function(commands) {
        return _.map(_.toArray(commands), function(cmd) {
            if (typeof cmd === 'string') {
                cmd = { command: cmd };
            }
            return _.transform(cmd, function(cmdObj, v, k) {
                if (k === 'command') {
                    cmdObj.cmd = v;
                } else if (k === 'downloadUrl') {
                    cmdObj.downloadUrl = v;
                /* istanbul ignore else */
                } else if (k === 'acceptedResponseCodes') {
                    cmdObj[k] = v;
                }
            }, {});
        });
    };

    return CatalogJob;
}
