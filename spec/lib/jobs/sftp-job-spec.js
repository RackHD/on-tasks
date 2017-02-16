// Copyright 2016, EMC, Inc.

'use strict';
var uuid = require('node-uuid');

describe('sftp-job', function() {
    var waterline = { ibms: {} },
        Emitter = require('events').EventEmitter,
        mockEncryption = { decrypt: function() {} },
        SftpJob,
        sftpJob,
        sshSettings;


    function sshMockGet(error, subError) {
        var mockSsh = new Emitter();
        mockSsh.session = new Emitter();
        mockSsh.error = error;
        mockSsh.eventList = [];
        mockSsh.session.error = subError;
        mockSsh.session.fastPut = function(src, dest, callback) {
            callback(this.error);
        };
        mockSsh.sftp = function(callback) {
            callback(this.error, this.session);
        };
        mockSsh.end = function() {
            this.emit('close');
        };
        mockSsh.addEvents = function(events) {
            this.eventList = this.eventList.concat(events);
        };
        mockSsh.connect = function() {
            var self = this;
            self.emit('ready');
            _.forEach(this.eventList, function(eventObj) {
                eventObj.source.emit(eventObj.event, eventObj.data);
            });
        };
        return mockSsh;
    }

    before(function() {
        helper.setupInjector([
            helper.require('/lib/jobs/sftp-job.js'),
            helper.di.simpleWrapper(mockEncryption, 'Services.Encryption'),
            helper.di.simpleWrapper({Client:function(){}}, 'ssh'),
            helper.require('/lib/jobs/base-job.js'),
            helper.di.simpleWrapper(waterline, 'Services.Waterline')
        ]);
        this.sandbox = sinon.sandbox.create();
        SftpJob = helper.injector.get('Job.Sftp');
    });

    describe('_run', function() {
        var options;

        beforeEach(function() {
            sshSettings = {
                config: {
                    host: 'the remote host',
                    port: 22,
                    username: 'someUsername',
                    password: 'somePassword',
                    privateKey: 'a pretty long, encrypted string'
                }
            };
            waterline.ibms.findByNode = this.sandbox.stub()
                .resolves(sshSettings);
            options = {fileSource: 'testSource', fileDestination: 'testDest'};
            sftpJob = new SftpJob(options, { target: 'someNodeId' }, uuid.v4());
        });

        afterEach(function() {
            this.sandbox.restore();
        });

        it('should use node credentials to sftp a file',function() {
            this.sandbox.stub(sftpJob, 'runSftp').resolves();
            return sftpJob._run()
            .then(function() {
                expect(waterline.ibms.findByNode).to.have.been.calledOnce;
                expect(sftpJob.runSftp).to.have.been.calledWith(sshSettings.config, {});
            });
        });

        it('should finish with an error if sftp fails', function() {
            var error = new Error('sftp error');
            this.sandbox.stub(sftpJob, '_done');
            this.sandbox.stub(sftpJob, 'runSftp').rejects(error);
            return sftpJob._run()
            .then(function() {
                expect(sftpJob._done).to.have.been.calledWith(error);
            });
        });
    });

    describe('runSftp', function() {
        var options;

        beforeEach(function() {
            sshSettings = {
                host: 'the remote host',
                port: 22,
                user: 'someUsername',
                password: 'somePassword',
                privateKey: 'a pretty long, encrypted string',
            };
            options = {fileSource: 'testSource', fileDestination: 'testDest'};
            sftpJob = new SftpJob(options, { target: 'someNodeId' }, uuid.v4());
            this.sandbox.stub(
                mockEncryption,
                'decrypt',
                function(string) { return 'decrypted' + string; }
            );
        });

        afterEach(function() {
            this.sandbox.restore();
        });

        it('should decrypt password and private key before connecting', function() {
            var mockSsh = sshMockGet();
            mockSsh.addEvents([{ source: mockSsh, event: 'close' }]);
            this.sandbox.spy(mockSsh, 'connect');
            return sftpJob.runSftp(sshSettings, mockSsh)
            .then(function() {
                expect(mockEncryption.decrypt).to.have.been.calledTwice;
                expect(mockEncryption.decrypt).to.have.been.calledWith(sshSettings.password);
                expect(mockEncryption.decrypt).to.have.been.calledWith(sshSettings.privateKey);
                expect(mockSsh.connect.args[0][0].password).to
                    .equal('decrypted' + sshSettings.password);
                expect(mockSsh.connect.args[0][0].privateKey).to
                    .equal('decrypted' + sshSettings.privateKey);
            });
        });

        it('should take settings and a client and return a promise to transfer a file', function() {
            var mockSsh = sshMockGet();
            this.sandbox.stub(mockSsh.session, 'fastPut');
            mockSsh.addEvents([ {source: mockSsh, event: 'close' }]);
            return sftpJob.runSftp(sshSettings, mockSsh)
            .then(function() {
                expect(mockSsh.session.fastPut).to.have.been.calledWith(
                    options.fileSource,
                    options.fileDestination
                );
                expect(mockSsh.session.fastPut.args[0][2]).to.be.a('function');
            });
        });

        it('should fail if sftp closes with an error', function() {
            var mockSsh = sshMockGet();
            mockSsh.addEvents([ {source: mockSsh, event: 'close', data: true } ]);
            this.sandbox.stub(mockSsh, 'sftp');
            return expect(sftpJob.runSftp(sshSettings, mockSsh)).to.be
                .rejectedWith(/failure transferring testSource/);
        });

        it('should fail if ssh emits and error event', function() {
            var mockSsh = sshMockGet();
            mockSsh.addEvents([
                { source: mockSsh, event: 'error', data: new Error('ssh error') }
             ]);
            this.sandbox.stub(mockSsh, 'sftp');
            return expect(sftpJob.runSftp(sshSettings, mockSsh)).to.be
                .rejectedWith(/ssh error/);
        });

        it('should fail if the sftp callback is invoked with an error', function() {
            var mockSsh = sshMockGet(new Error('sftp error'));
            mockSsh.addEvents([ {source: mockSsh, event: 'close', data: true } ]);
            return expect(sftpJob.runSftp(sshSettings, mockSsh)).to.be
                .rejectedWith(/sftp error/);
        });

        it('should pass timeout options to ssh.connect', function() {
            var mockSsh = sshMockGet();
            options = {
                fileSource: 'testSource',
                fileDestination: 'testDest',
                keepaliveInterval: 3000,
                keepaliveCountMax: 4,
                timeout: 30000
            };
            sftpJob = new SftpJob(options, { target: 'someNodeId' }, uuid.v4());
            this.sandbox.spy(mockSsh, 'connect');
            mockEncryption.decrypt.restore();
            this.sandbox.stub(
                mockEncryption,
                'decrypt',
                function(string) { return string; }
            );

            return sftpJob.runSftp(sshSettings, mockSsh)
            .then(function() {
                expect(mockSsh.connect).to.be.calledWithExactly({
                    host: 'the remote host',
                    port: 22,
                    username: 'someUsername',
                    password: 'somePassword',
                    privateKey: 'a pretty long, encrypted string',
                    keepaliveInterval: 3000,
                    keepaliveCountMax: 4,
                    readyTimeout: 30000
                });
            });
        });
    });
});
