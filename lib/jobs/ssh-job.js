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
    'Services.Encryption',
    'ssh',
    'JobUtils.Commands',
    '_'
));

function sshJobFactory(
    BaseJob,
    parser,
    util,
    Logger,
    assert,
    Promise,
    waterline,
    cryptService,
    ssh,
    CommandUtil,
    _
) {
    var logger = Logger.initialize(sshJobFactory);
    var commandUtil;
    function SshJob(options, context, taskId) {
        SshJob.super_.call(this, logger, options, context, taskId);
        assert.string(this.context.target);
        this.nodeId = this.context.target;
        commandUtil = new CommandUtil(this.nodeId);
        this.commands = commandUtil.buildCommands(options.commands);
        assert.arrayOfObject(this.commands);
    }
    util.inherits(SshJob, BaseJob);

    SshJob.prototype._run = function run() {
        var self = this;
        return waterline.nodes.needByIdentifier(self.nodeId)
        .then(function(node) {
            return Promise.reduce(self.commands, function(results, commandData) {
                return self.sshExec(commandData, node.sshSettings, new ssh.Client())
                .then(function(result) {
                    return results.concat([result]);
                });
            }, []);
        })
        .then(commandUtil.parseResponse.bind(commandUtil))
        .spread(commandUtil.catalogParsedTasks.bind(commandUtil))
        .spread(function() {
            self._done();
        })
        .catch(self._done.bind(self));
    };

    SshJob.prototype.sshExec = function(cmdObj, sshSettings, sshClient) {
        return new Promise(function(resolve, reject) {
            if(cmdObj.timeout) {
                setTimeout(function() {
                    var seconds = cmdObj.timeout / 1000;
                    reject(new Error('The remote operation timed out after '+
                                 seconds + ' seconds'));
                }, cmdObj.timeout);
            }
            var ssh = sshClient;
            ssh.on('ready', function() {
                ssh.exec(cmdObj.cmd, function(err, stream) {
                    if (err) { reject(err); }
                    stream.on('close', function(code) {
                        cmdObj.exitCode = code;
                        ssh.end();
                    }).on('data', function(data) {
                        cmdObj.stdout = ( cmdObj.stdout || '' ) + data.toString();
                    })
                    .on('error', function(err) {
                        reject(err);
                    })
                    .stderr.on('data', function(data) {
                        cmdObj.stderr = ( cmdObj.stderr || '' ) + data.toString();
                    });
                });
            })
            .on('error', function(err) {
                logger.error('ssh error', {
                    error: err,
                    host: sshSettings.host,
                    task: cmdObj,
                    level: err.level,
                    description: err.description
                });
                reject(err);
            })
            .on('close', function(hasErr) {

                if (hasErr || (cmdObj.exitCode &&
                    !_.contains(cmdObj.acceptedResponseCodes, cmdObj.exitCode))) {
                    logger.error("Failure running remote command", {task:cmdObj});

                    reject(new Error(
                            "Encountered a failure running "+cmdObj.cmd+
                            "on remote host"+ sshSettings.host
                    ));
                } else {
                    resolve(cmdObj);
                }
            });
            ssh.connect({
                host: sshSettings.host,
                port: sshSettings.port || 22,
                username: sshSettings.user,
                password: cryptService.decrypt(sshSettings.password),
                privateKey: cryptService.decrypt(sshSettings.privateKey)
            });
        });
    };

    return SshJob;
}

