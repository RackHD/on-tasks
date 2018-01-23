// Copyright 2016, EMC, Inc.

'use strict';

var di = require('di');
module.exports = sshCommandJobFactory;

di.annotate(sshCommandJobFactory, new di.Provide('Job.Ssh.Command'));
di.annotate(sshCommandJobFactory, new di.Inject(
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

function sshCommandJobFactory(
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
    var logger = Logger.initialize(sshCommandJobFactory);

    function SshCommandJob(options, context, taskId) {
        SshCommandJob.super_.call(this, logger, options, context, taskId);
        assert.string(this.context.target);
        this.nodeId = this.context.target;
        this.commandUtil = new CommandUtil(this.nodeId);
        this.commands = this.commandUtil.buildCommands(options.commands);
        this.commandUtil.updateExistingCatalog = options.updateExistingCatalog;
        this.sshExecOptions = options.sshExecOptions;
        assert.arrayOfObject(this.commands);
    }
    util.inherits(SshCommandJob, BaseJob);

    SshCommandJob.prototype._run = function run() {
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
        .then(self.commandUtil.parseUnknownTasks.bind(self.commandUtil))
        .tap(self.commandUtil.updateLookups.bind(self.commandUtil))
        .spread(self.commandUtil.catalogParsedTasks.bind(self.commandUtil))
        .spread(function() {
            self._done();
        })
        .catch(self._done.bind(self));
    };
    return SshCommandJob;
}
