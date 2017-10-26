// Copyright 2016, EMC, Inc.

'use strict';

var di = require('di');
module.exports = sftpJobFactory;

di.annotate(sftpJobFactory, new di.Provide('Job.Sftp'));
di.annotate(sftpJobFactory, new di.Inject(
    'Job.Base',
    'Util',
    'Logger',
    'Assert',
    'Promise',
    'Services.Encryption',
    'ssh',
    'fs',
    'Services.Waterline'
));

function sftpJobFactory(
    BaseJob,
    util,
    Logger,
    assert,
    Promise,
    cryptService,
    ssh,
    fs,
    waterline
) {
    var logger = Logger.initialize(sftpJobFactory);

    function SftpJob(options, context, taskId) {
        SftpJob.super_.call(this, logger, options, context, taskId);
        assert.string(options.fileSource);
        assert.string(options.fileDestination);
        assert.string(this.context.target);
        assert.optionalNumber(options.timeout);
        assert.optionalNumber(options.keepaliveInterval);
        assert.optionalNumber(options.keepaliveCountMax);

        this.nodeId = this.context.target;
        this.timeout = options.timeout;
        this.keepaliveInterval = options.keepaliveInterval;
        this.keepaliveCountMax = options.keepaliveCountMax;
        this.fileSource = options.fileSource;
        this.fileDestination = options.fileDestination;
        this.isPDU= options.isPDU;
    }
    util.inherits(SftpJob, BaseJob);

    SftpJob.prototype._run = function() {
        var self = this;
        return waterline.ibms.findByNode(this.nodeId, 'ssh-ibm-service')
        .then(function(sshSettings) {
            return self.runSftp(sshSettings.config, new ssh.Client());
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

            var ssh = sshClient;
            ssh.on('ready', function() {
                ssh.sftp(function(err, sftp) {
                    if (err) { reject(err); }
                    if (self.isPDU === "true") {
                        var readStream = fs.createReadStream(self.fileSource);
                        var writeStream = sftp.createWriteStream(self.fileDestination);
                        readStream.pipe(writeStream);
                        writeStream.on('close',function(){ ssh.end(); });
                    } else {
                        sftp.fastPut(
                            self.fileSource,
                            self.fileDestination,
                            function(err) {
                                if(err) {  reject(err); }
                                ssh.end();
                            }
                        );
                    }
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

            var sshConfig = {
                host: sshSettings.host,
                port: sshSettings.port || 22,
                username: sshSettings.user,
                password: cryptService.decrypt(sshSettings.password),

                algorithms: {
                    kex: ['ecdh-sha2-nistp256', 'ecdh-sha2-nistp384',
                        'ecdh-sha2-nistp521','diffie-hellman-group1-sha1'],
                    serverHostKey: [ 'ssh-rsa', 'ssh-dss' ],
                    cipher: ['aes256-cbc','aes192-cbc','aes128-cbc','3des-cbc']
                },

                keepaliveInterval: self.keepaliveInterval || 0, //disabled by default
                keepaliveCountMax: self.keepaliveCountMax || 3,
                readyTimeout: self.timeout || 20000
            };
            if (sshSettings.privateKey) {
                sshConfig.privateKey = cryptService.decrypt(sshSettings.privateKey);
            }
            ssh.connect(sshConfig);
        });
    };
    return SftpJob;
}
