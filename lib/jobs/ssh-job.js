// Copyright 2016, EMC, Inc.

'use strict';

var di = require('di');
module.exports = sshJobFactory;

di.annotate(sshJobFactory, new di.Provide('Job.Ssh'));
di.annotate(sshJobFactory, new di.Inject(
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

function sshJobFactory(
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
    var logger = Logger.initialize(sshJobFactory);

    function SshJob(options, context, taskId) {
        SshJob.super_.call(this, logger, options, context, taskId);
        assert.string(this.context.target);
        this.nodeId = this.context.target;
        this.commandUtil = new CommandUtil(this.nodeId);
        this.commands = this.commandUtil.buildCommands(options.commands);
        assert.arrayOfObject(this.commands);
    }
    util.inherits(SshJob, BaseJob);

    SshJob.prototype._run = function run() {
        var self = this;
        return waterline.nodes.needByIdentifier(self.nodeId)
        .then(function(node) {
            return Promise.reduce(self.commands, function(results, commandData) {
                return self.commandUtil.sshExec(
                    commandData, node.sshSettings, new ssh.Client()
                )
                .then(function(result) {
                    return results.concat([result]);
                });
            }, []);
        })
        .then(self.commandUtil.parseResponse.bind(self.commandUtil))
        .tap(self.commandUtil.updateLookups.bind(self.commandUtil))
        .spread(self.commandUtil.catalogParsedTasks.bind(self.commandUtil))
        .spread(function() {
            self._done();
        })
        .catch(self._done.bind(self));
    };
    return SshJob;
}
