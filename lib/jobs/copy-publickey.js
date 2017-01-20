// Copyright 2016, EMC, Inc.

'use strict';

var di = require('di');
module.exports = copyKeyJobFactory;

di.annotate(copyKeyJobFactory, new di.Provide('Job.CopySshKey'));
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

    /**
     * A job to copy an ssh public key from a node document's sshSettings field
     * to .ssh/authorized keys on the node
     *
     * @constructor
     */
    function CopyKeyJob(options, context, taskId) {
        CopyKeyJob.super_.call(this, logger, options, context, taskId);
        assert.string(this.context.target);
        this.nodeId = this.context.target;
        this.commandUtil = new CommandUtil(this.nodeId);
    }
    util.inherits(CopyKeyJob, BaseJob);

    CopyKeyJob.prototype._run = function run() {
        var self = this;
        return waterline.ibms.findByNode(self.nodeId, 'ssh-ibm-service')
        .then(function(sshSettings) {
            assert.string(sshSettings.config.publicKey);
            var commands = [
                {cmd: 'mkdir -p .ssh'},
                {cmd: 'echo '+sshSettings.config.publicKey+' >> .ssh/authorized_keys'}
            ];
            return Promise.each(commands, function(commandData) {
                return self.commandUtil.sshExec(
                    commandData, sshSettings.config, new ssh.Client()
                );
            });
        })
        .then(function() {
            self._done();
        })
        .catch(function(err) {
            logger.error("Error copying public key", {error: err});
            self._done(err);
        });
    };

    return CopyKeyJob;
}

