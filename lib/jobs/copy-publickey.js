// Copyright 2016, EMC, Inc.

'use strict';

var di = require('di');
module.exports = copyKeyJobFactory;

di.annotate(copyKeyJobFactory, new di.Provide('Job.CopyKey'));
di.annotate(copyKeyJobFactory, new di.Inject(
    'Job.Base',
    'Util',
    'Logger',
    'Assert',
    'Promise',
    'Services.Waterline',
    'ssh',
    'JobUtils.Commands'
));

function copyKeyJobFactory(
    BaseJob,
    util,
    Logger,
    assert,
    Promise,
    waterline,
    ssh,
    CommandUtil
) {
    var logger = Logger.initialize(copyKeyJobFactory);
    var commandUtil;
    function CopyKeyJob(options, context, taskId) {
        CopyKeyJob.super_.call(this, logger, options, context, taskId);
        assert.string(this.context.target);
        this.nodeId = this.context.target;
        commandUtil = new CommandUtil(this.nodeId);
    }
    util.inherits(CopyKeyJob, BaseJob);

    CopyKeyJob.prototype._run = function run() {
        var self = this;
        return waterline.nodes.needByIdentifier(self.nodeId)
        .then(function(node) {
            var commands = [
                {cmd: 'mkdir -p .ssh'},
                {cmd: 'echo '+node.sshSettings.publicKey+' >> .ssh/authorized_keys'}
            ];
            return Promise.map(commands, function(commandData) {
                return commandUtil.sshExec(
                    commandData, node.sshSettings, new ssh.Client()
                );
            });
        })
        .then(function(result) {
            logger.debug("Received copykey result", {
                stdout: result.stdout,
                stderr: result.stderr
            });
        })
        .then(function() {
            self._done();
        })
        .catch(function(err) {
            logger.debug("Error copying public key", {error: err});
            self._done(err);
        });
    };

    return CopyKeyJob;
}

