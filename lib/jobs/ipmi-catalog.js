// Copyright 2015, EMC, Inc.

'use strict';

var di = require('di');

module.exports = ipmiCatalogJobFactory;
di.annotate(ipmiCatalogJobFactory, new di.Provide('Job.LocalIpmi.Catalog'));
    di.annotate(ipmiCatalogJobFactory,
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
function ipmiCatalogJobFactory(
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
    var logger = Logger.initialize(ipmiCatalogJobFactory);

    function revealSecrets (options) {
        if (options.password) {
            options.password = encryption.decrypt(options.password);
        }

        if (options.community) {
            options.community = encryption.decrypt(options.community);
        }

        return options;
    }

    /**
     * @param {Object} options
     * @param {Object} context
     * @param {String} taskId
     * @constructor
     */
    function IpmiCatalogJob(options, context, taskId) {
        IpmiCatalogJob.super_.call(this, logger, options, context, taskId);

        assert.string(this.context.target);

        this.nodeId = this.context.target;
        this.commands = options.commands;
        this.commands = _.isArray(options.commands) ? options.commands : [options.commands];
    }
    util.inherits(IpmiCatalogJob, BaseJob);

    /**
     * @memberOf IpmiCommandJob
     */
    IpmiCatalogJob.prototype._run = function() {
        var self = this;
        var cmdResp = [];

        waterline.nodes.findByIdentifier(self.nodeId)
        .then(function (node) {
            assert.ok(node, 'No node for ipmi catalog');

            var obmSetting = _.find(node.obmSettings, { service: 'ipmi-obm-service' });
            assert.ok(obmSetting, 'No ipmi obmSetting for ipmi catalog');

            return obmSetting.config;
        })
        .then(revealSecrets)
        .then(function(obmSetting) {
            return Promise.each(self.commands, function(cmd) {
                return self.runCommand(obmSetting, cmd)
                .then(function(ret) {
                    cmdResp.push(ret);
                });
            });
        })
        .then(function() {
            return cmdResp;
        })
        .then(self.handleResponse.bind(self))
        .then(function() {
            self._done();
        })
        .catch(function(e) {
            self._done(e);
        });

    };

    /**
     * @memberOf IpmiCommandJob
     */
    IpmiCatalogJob.prototype.formatCmd = function (obmSettings, cmd) {
        assert.object(obmSettings);

        var command;

        if (typeof cmd === 'string') {
            command = cmd;
        } else if (_.has(cmd, 'command') && typeof cmd.command === 'string') {
            command = cmd.command;
        } else {
            return null;
        }

        return {
            oriCmd: command,
            newCmd: [
                '-I', 'lanplus',
                '-U', obmSettings.user,
                '-P', obmSettings.password,
                '-H', obmSettings.host
            ].concat(command.split(" "))
        };
    };

    /**
     * @memberOf IpmiCommandJob
     */
    IpmiCatalogJob.prototype.runCommand = function (obmSetting, cmd) {
        var self = this;

        var formatedCmd = self.formatCmd(obmSetting, cmd);

        assert.arrayOfString(formatedCmd.newCmd);

        return Promise.resolve()
        .then(function() {
            var childProcess = new ChildProcess(
                                            'ipmitool',
                                            formatedCmd.newCmd,
                                            {},
                                            cmd.acceptedResponseCodes);

            logger.debug("Sending command to node.", {
                command: formatedCmd.newCmd.join(),
                nodeId: self.nodeId
            });

            return childProcess.run({ retries: 0, delay: 0 });
        })
        .then(function(ret) {
            // Modify the command to match the format in command parser
            ret.cmd = "sudo ipmitool ".concat(formatedCmd.oriCmd);

            logger.debug("Received respond from node.", {
                nodeId: self.nodeId,
                error: ret.error
            });
            return ret;
        });
    };

    /**
     * @memberOf IpmiCommandJob
     */
    IpmiCatalogJob.prototype.handleResponse = function(result) {
        var self = this;

        return parser.parseTasks(result)
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


    return IpmiCatalogJob;
}
