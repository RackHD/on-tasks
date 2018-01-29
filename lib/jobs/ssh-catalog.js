// Copyright 2018, Dell EMC, Inc.

'use strict';

var di = require('di');
module.exports = sshCatalogJobFactory;

di.annotate(sshCatalogJobFactory, new di.Provide('Job.Ssh.Catalog'));
di.annotate(sshCatalogJobFactory, new di.Inject(
    'Job.Base',
    'JobUtils.CommandParser',
    'Util',
    'Logger',
    'Assert',
    'Promise',
    'Services.Waterline',
    'ssh',
    'JobUtils.Commands'
));

function sshCatalogJobFactory(
    BaseJob,
    parser,
    util,
    Logger,
    assert,
    Promise,
    waterline,
    ssh,
    CommandUtil
) {
    var logger = Logger.initialize(sshCatalogJobFactory);

    function SshCatalogJob(options, context, taskId) {
        SshCatalogJob.super_.call(this, logger, options, context, taskId);
        assert.string(this.context.target);
        this.nodeId = this.context.target;
        this.commandUtil = new CommandUtil(this.nodeId);
        this.commands = this.commandUtil.buildCommands(options.commands);
        this.commandUtil.updateExistingCatalog = options.updateExistingCatalog;
        this.sshExecOptions = options.sshExecOptions;
        assert.arrayOfObject(this.commands);
    }
    util.inherits(SshCatalogJob, BaseJob);

    SshCatalogJob.prototype._run = function run() {
        var self = this;
        return waterline.ibms.findByNode(self.nodeId, 'ssh-ibm-service')
        .then(function(sshSettings) {
            return Promise.reduce(self.commands, function(results, commandData) {
                return self.commandUtil.sshExec(
                    commandData, sshSettings.config, new ssh.Client(), self.sshExecOptions
                )
                .then(function(result) {
                    return results.concat([result]);
                });
            }, []);
        })
        .then(parser.parseTasks.bind(parser))
        .tap(self.commandUtil.updateLookups.bind(self.commandUtil))
        .spread(self.commandUtil.catalogParsedTasks.bind(self.commandUtil))
        .spread(function() {
            self._done();
        })
        .catch(self._done.bind(self));
    };
    return SshCatalogJob;
}
