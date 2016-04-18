// Copyright 2016, EMC, Inc.

'use strict';

var di = require('di');
module.exports = sftpJobFactory;

var Client = require('ssh2').Client;
di.annotate(sftpJobFactory, new di.Provide('Job.Sftp'));
di.annotate(sftpJobFactory, new di.Inject(
    'Job.Base',
    'Util',
    'Logger',
    'Assert',
    'Promise',
    'Services.Encryption',
    'Services.Waterline'
));

function sftpJobFactory(
    BaseJob,
    util,
    Logger,
    assert,
    Promise,
    cryptService,
    waterline
) {
    var logger = Logger.initialize(sftpJobFactory);

    function SftpJob(options, context, taskId) {
        SftpJob.super_.call(this, logger, options, context, taskId);
        assert.string(options.fileSource);
        assert.string(options.fileDestination);

        assert.string(this.context.target);
        this.nodeId = this.context.target;
        this.timeout = options.timeout;
        this.fileSource = options.fileSource;
        this.fileDestination = options.fileDestination;
    }
    util.inherits(SftpJob, BaseJob);

    SftpJob.prototype._run = function run() {
        var self = this;
        return waterline.nodes.needByIdentifier(this.context.target)
        .then(function(node) {
                return self.runSftp(node.sshSettings, new Client());
            })
            .then(function() {
                self._done();
            })
            .catch(function(e) {
                self._done(e);
            });
    };

    SftpJob.prototype.runSftp = function(sshSettings, sshClient) {
        var self = this;
        return new Promise(function(resolve, reject) {
            if(self.timeout) {
                setTimeout(function() {
                    var seconds = self.timeout / 1000;
                    reject(new Error('The file transfer timed out after '+
                                 seconds + ' seconds'));
                }, self.timeout);
            }

            var ssh = sshClient;
            ssh.on('ready', function() {
                ssh.sftp(function(err, sftp) {
                    if (err) { reject(err); }
                    sftp.fastPut(
                            self.fileSource,
                            self.fileDestination,
                            function(err) {
                                if(err) {  reject(err); }
                                ssh.end();
                            }
                    );
                });
            })
            .on('error', function(err) {
                logger.error('error while attempting sftp', {
                    source: self.fileSource,
                    destination: self.fileDestination,
                    error: err,
                    host: sshSettings.host,
                });
                reject(err);
            })
            .on('close', function(hasErr) {
                if (hasErr) {
                    logger.error("Failure transferring file", {
                        source: self.fileSource,
                        destination: self.fileDestination,
                        host: sshSettings.host
                    });

                    reject(new Error(
                            "Encountered a failure transferring "+self.fileSource+
                            "to "+self.fileDestination+"on remote host"+ sshSettings.host
                    ));
                } else {
                    resolve();
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
    return SftpJob;
}
