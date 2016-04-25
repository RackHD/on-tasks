// Copyright 2016, EMC, Inc.

'use strict';
var uuid = require('node-uuid');

describe('ssh-job', function() {
    var waterline = { nodes: {}, catalogs: {} },
        mockParser = {},
        Emitter = require('events').EventEmitter,
        mockEncryption = {},
        SshJob,
        sshJob;

    var commandUtil = {};
    function CommandUtil() { return commandUtil; }

    function sshMockGet(eventList, error) {
        var mockSsh = new Emitter();
        mockSsh.events = new Emitter();
        mockSsh.stdout = mockSsh.events;
        mockSsh.events.stderr = new Emitter();
        mockSsh.stderr = mockSsh.events.stderr;
        mockSsh.eventList = eventList;
        mockSsh.error = error;
        mockSsh.exec = function(cmd, callback) {
            callback(this.error, this.events);
        };
        mockSsh.end = function() {
            this.emit('close');
        };
        mockSsh.connect = function() {
            var self = this;
            self.emit('ready');
            _.forEach(this.eventList, function(eventObj) {
                eventObj = _.defaults(eventObj, {event: 'data', source: 'stdout'});
                self[eventObj.source].emit(eventObj.event, eventObj.data);
            });
        };
        return mockSsh;
    }

    before(function() {
        helper.setupInjector([
            helper.require('/lib/jobs/ssh-job.js'),
            helper.require('/lib/jobs/base-job.js'),
            helper.di.simpleWrapper(CommandUtil, 'JobUtils.Commands'),
            helper.di.simpleWrapper(mockParser, 'JobUtils.CommandParser'),
            helper.di.simpleWrapper(mockEncryption, 'Services.Encryption'),
            helper.di.simpleWrapper({Client:function(){}}, 'ssh'),
            helper.di.simpleWrapper(waterline, 'Services.Waterline')
        ]);
        this.sandbox = sinon.sandbox.create();
        SshJob = helper.injector.get('Job.Ssh');
    });

    describe('_run', function() {
        var sshSettings,
            testCommands;

        before(function() {
            testCommands = [
                {cmd: 'aCommand', source: 'test'},
                {cmd: 'testCommand'}
            ];
            commandUtil.buildCommands = this.sandbox.stub().returns(testCommands);
            sshJob = new SshJob({}, { target: 'someNodeId' }, uuid.v4());
            waterline.nodes.needByIdentifier = this.sandbox.stub();
            this.sandbox.stub(sshJob, 'sshExec').resolves();
            mockParser.parseTasks = this.sandbox.stub().resolves();
            mockParser.parseUnknownTasks = this.sandbox.stub().resolves();
            sshSettings = {
                host: 'the remote host',
                port: 22,
                username: 'someUsername',
                password: 'somePassword',
                privateKey: 'a pretty long string',
            };

            expect(sshJob).to.have.property('commandUtil');
        });

        afterEach(function() {
            this.sandbox.restore();
        });

        it('should execute the given remote commands using credentials'+
        ' from a node and handle the responses', function() {
            commandUtil.parseResponse = this.sandbox.stub().resolves([
                    {data:'data', source: 'aCommand'},
                    {data:'more data', source: 'testCommand'}
            ]);
            commandUtil.catalogParsedTasks = this.sandbox.stub().resolves(
            [{data:'data', source: 'test'}]
            );

            var node = { sshSettings: sshSettings };
            waterline.nodes.needByIdentifier.resolves(node);
            sshJob.sshExec.onCall(0).resolves({stdout: 'data', cmd: 'aCommand'});
            sshJob.sshExec.onCall(1).resolves({stdout: 'more data', cmd: 'testCommand'});
            sshJob.commands = testCommands;

            return sshJob._run()
            .then(function() {
                expect(sshJob.sshExec).to.have.been.calledTwice
                    .and.calledWith(sshJob.commands[0], sshSettings)
                    .and.calledWith(sshJob.commands[1], sshSettings);
                expect(commandUtil.parseResponse).to.have.been.calledOnce
                    .and.calledWith([
                        {stdout: 'data', cmd: 'aCommand'},
                        {stdout: 'more data', cmd: 'testCommand'}
                    ]);
                expect(commandUtil.catalogParsedTasks).to.have.been.calledOnce
                    .and.calledWith(
                        {data: 'data', source: 'aCommand'},
                        {data: 'more data', source: 'testCommand'}
                    );
            });
        });
    });

    describe('sshExec', function() {
        var sshSettings,
            testCmd;

        beforeEach(function() {
            sshJob = new SshJob({}, { target: 'someNodeId' }, uuid.v4());
            mockEncryption.decrypt = this.sandbox.stub();
            testCmd = {cmd: 'doStuff'};
            sshSettings = {
                host: 'the remote host',
                port: 22,
                username: 'someUsername',
                password: 'somePassword',
                privateKey: 'a pretty long string',
            };
        });

        it('should return a promise for an object with stdout/err and exit code', function() {
            var events = [
                { data: 'test ' },
                { data: 'string' },
                { event: 'close', data: 0 }
            ];

            return sshJob.sshExec(testCmd, sshSettings, sshMockGet(events))
            .then(function(data) {
                expect(data.stdout).to.equal('test string');
                expect(data.stderr).to.equal(undefined);
                expect(data.exitCode).to.equal(0);
            });
        });

        it('should reject if exit code is not in accepted exit codes', function() {
            var events = [
                {event: 'data', source: 'stderr', data: 'errData' },
                { event: 'close', data: 127 }
            ];
            return expect(
                sshJob.sshExec(testCmd, sshSettings, sshMockGet(events))
            ).to.be.rejected;
        });

        it('should decrypt passwords and private keys', function() {
            var mockClient = sshMockGet([{ event: 'close', data: 0 }]);
            return sshJob.sshExec(testCmd, sshSettings, mockClient)
            .then(function() {
                expect(mockEncryption.decrypt.callCount).to.equal(2);
                expect(mockEncryption.decrypt)
                    .to.have.been.calledWith(sshSettings.password);
                expect(mockEncryption.decrypt)
                    .to.have.been.calledWith(sshSettings.privateKey);
            });
        });

        it('should time out if given the option', function() {
            var mockClient = sshMockGet();
            testCmd.timeout = 10;
            mockClient.connect = function() {
                return Promise.delay(20);
            };

            return expect(sshJob.sshExec(testCmd, sshSettings, mockClient)).to
                .be.rejectedWith(/timed out/);
        });

        it('should reject on ssh error events', function() {
            var error = new Error('ssh error');
            error.level = 'client-ssh'; //may also be 'client-socket'

            var mockClient = sshMockGet();
            mockClient.connect = function() {
                this.emit('error', error);
            };
            return expect(sshJob.sshExec(testCmd, sshSettings, mockClient)).to
                .be.rejectedWith(/ssh error/);
        });

        it('should reject on ssh stdout stream error events', function() {
            var error = new Error('ssh stream error');

            var mockClient = sshMockGet();
            mockClient.connect = function() {
                var self = this;
                this.emit('ready');
                setImmediate(function() {
                    self.stdout.emit('error', error);
                });
            };
            return expect(sshJob.sshExec(testCmd, sshSettings, mockClient)).to
                .be.rejectedWith(/ssh stream error/);
        });

        it('should reject if underlying ssh returns a remote error', function() {
            var mockClient = sshMockGet(
                [{ event: 'close', data: 0 }],
                new Error('ssh error')
            );

            return expect(sshJob.sshExec(testCmd, sshSettings, mockClient)).to
                .be.rejected;
        });
    });

});
