// Copyright 2015, EMC, Inc.

'use strict';

describe('Command Util', function() {
    var waterline = { catalogs: {}, lookups: {} },
        parser = {},
        Emitter = require('events').EventEmitter,
        lookup = {},
        mockEncryption = {},
        CmdUtil,
        commandUtil;

    function sshMockGet(eventList, error) {
        var mockSsh = new Emitter();
        mockSsh.events = new Emitter();
        mockSsh.stdout = mockSsh.events;
        mockSsh.events.stderr = new Emitter();
        mockSsh.stderr = mockSsh.events.stderr;
        mockSsh.eventList = eventList;
        mockSsh.error = error;
        mockSsh.exec = function() {
            arguments[arguments.length-1](this.error, this.events);
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
            helper.require('/lib/utils/job-utils/command-util.js'),
            helper.di.simpleWrapper(parser, 'JobUtils.CommandParser'),
            helper.di.simpleWrapper(lookup, 'Services.Lookup'),
            helper.di.simpleWrapper(mockEncryption, 'Services.Encryption'),
            helper.di.simpleWrapper(waterline, 'Services.Waterline')
        ]);

        CmdUtil = helper.injector.get('JobUtils.Commands');
        this.sandbox = sinon.sandbox.create();
    });

    describe('parseUnknownTasks', function() {
        beforeEach(function() {
            commandUtil = new CmdUtil('fakeNodeId');
            this.sandbox.stub(commandUtil, 'catalogParsedTasks');

            parser.parseUnknownTasks = this.sandbox.stub().resolves();
        });

        afterEach(function() {
            this.sandbox.restore();
        });

        it('should parse an array of tasks and return an array of promises',function() {
            var tasks = [
                {stdout: 'data', cmd: 'remoteCommand', catalog: true},
                {stdout: 'data', cmd: 'remoteCommand', catalog: true},
                {stdout: 'data', cmd: 'remoteCommand', catalog: true}
            ];
            return commandUtil.parseUnknownTasks(tasks)
            .then(function() {
                expect(parser.parseUnknownTasks).to.have.been.calledOnce;
            });
        });

        it('should bubble up parsing errors', function() {
            var tasks = [
                {stdout: 'data', cmd: 'remoteCommand', catalog: true},
                {stdout: 'data', cmd: 'remoteCommand', catalog: true},
                {stdout: 'data', cmd: 'remoteCommand', catalog: true}
            ];
            parser.parseUnknownTasks.rejects(new Error('parsing error'));
            return expect(commandUtil.parseUnknownTasks(tasks)).to.be.rejectedWith(/parsing error/);
        });

        it('should only parse tasks marked for cataloging', function() {
            var tasks = [
                {stdout: 'data', catalog: false, cmd: 'test'},
                {stdout: 'data', catalog: true, cmd: 'test'}
            ];

            return commandUtil.parseUnknownTasks(tasks)
            .then(function() {
                expect(parser.parseUnknownTasks).to.have.been.calledWithExactly([tasks[1]]);
            });
        });
    });

    describe('handleRemoteFailure', function() {

        beforeEach(function() {
            commandUtil = new CmdUtil('fakeNodeId');
        });

        it('should take an array of tasks and return a promise for an array of tasks',
        function() {
            var tasks = [
                {stdout: 'data', catalog: false, cmd: 'test'},
                {stdout: 'data', catalog: true, cmd: 'test'}
            ];
            return commandUtil.handleRemoteFailure(tasks)
            .then(function(_tasks) {
                expect(_tasks).to.deep.equal(tasks);
            });

        });

        it('should not throw an error for tasks with accepted exit codes', function(){
            var tasks = [
                {
                    stdout: 'data', catalog: false, cmd: 'test',
                    acceptedResponseCodes: [0, 127], error: {code: 127}
                },
                {
                    stdout: 'data', catalog: true, cmd: 'test',
                    acceptedResponseCodes: [0, 127], error: {code: 127}
                }
            ];
            return expect(commandUtil.handleRemoteFailure(tasks)).to.be.fulfilled;
        });

        it('should throw an error if a task\'s exit code is not in it\'s '+
        'acceptedResponseCodes', function() {
            var tasks = [
                {
                    stdout: 'data', catalog: false, cmd: 'test',
                    acceptedResponseCodes: [0], error: {code: 127}
                },
            ];
            return expect(commandUtil.handleRemoteFailure(tasks)).to.be
            .rejectedWith(/Encountered a failure/);
        });
    });

    describe('catalogParsedTasks', function() {
        beforeEach(function() {
            commandUtil = new CmdUtil('fakeNodeId');
            waterline.catalogs.create = this.sandbox.stub().resolves();
            waterline.catalogs.update = this.sandbox.stub().resolves();
            waterline.catalogs.count = this.sandbox.stub().resolves();
        });

        afterEach(function() {
            this.sandbox.restore();
        });

        it('should take an arbitrary number of parsed tasks and return '+
        'an array of promises to catalog them', function() {
            var tasks = [
                {source: 'test', data:'stdout', store: true},
                {source: 'test', data:'stdout', store: true},
                {source: 'test', data:'stdout', store: true},
                {source: 'test', data:'stdout', store: true},
                {source: 'test', data:'stdout', store: true}
            ];
            return Promise.resolve(tasks)
            .spread(commandUtil.catalogParsedTasks.bind(commandUtil))
            .then(function() {
                expect(waterline.catalogs.create.callCount).to.equal(5);
            });
        });

        it('should not try to catalog tasks with errors', function() {
            var tasks = [
                {source: 'test', data:'goodData', store: true},
                {source: 'test', data:'', store: true, error: new Error('parsing erorr')}
            ];

            return Promise.resolve(tasks)
            .spread(commandUtil.catalogParsedTasks.bind(commandUtil))
            .then(function() {
                expect(waterline.catalogs.create).to.have.been.calledOnce;
                expect(waterline.catalogs.create).to.have.been
                    .calledWithExactly({source: 'test', data:'goodData', node: commandUtil.nodeId});
            });
        });

        it('should only catalog tasks marked for cataloging', function() {
            var tasks = [
                {source: 'test', data:'goodData', store: true},
                {source: 'test', data:'otherData'}
            ];

            return Promise.resolve(tasks)
            .spread(commandUtil.catalogParsedTasks.bind(commandUtil))
            .then(function() {
                expect(waterline.catalogs.create).to.have.been.calledOnce;
                expect(waterline.catalogs.create).to.have.been
                .calledWithExactly({source: 'test', data:'goodData', node: commandUtil.nodeId});
            });
        });

        it('should optionally update an existing catalog', function() {
            var tasks = [
                {source: 'test', data:'goodData', store: true},
                {source: 'test', data:'otherData'}
            ];
            var query = {node: commandUtil.nodeId, source: 'test'};
            commandUtil.updateExistingCatalog = true;
            waterline.catalogs.count.resolves(1);

            return Promise.resolve(tasks)
                .spread(commandUtil.catalogParsedTasks.bind(commandUtil))
                .then(function() {
                    expect(waterline.catalogs.update).to.have.been.calledOnce;
                    expect(waterline.catalogs.update).to.have.been
                        .calledWithExactly(query, {
                            source: 'test',
                            data:'goodData',
                            node: commandUtil.nodeId
                        });
                });
        });

        it('should create a new catalog if it does not already exist', function() {
            var tasks = [
                {source: 'test', data:'goodData', store: true},
                {source: 'test', data:'otherData'}
            ];
            commandUtil.updateExistingCatalog = true;
            waterline.catalogs.count.resolves(0);

            return Promise.resolve(tasks)
                .spread(commandUtil.catalogParsedTasks.bind(commandUtil))
                .then(function() {
                    expect(waterline.catalogs.update).not.to.have.been.called;
                    expect(waterline.catalogs.create).to.have.been.calledOnce;
                });
        });
    });

    describe('sshExec', function() {
        var sshSettings,
            testCmd;

        beforeEach(function() {
            commandUtil = new CmdUtil('fakeNodeId');
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

            return commandUtil.sshExec(testCmd, sshSettings, sshMockGet(events))
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
                commandUtil.sshExec(testCmd, sshSettings, sshMockGet(events))
            ).to.be.rejected;
        });

        it('should decrypt passwords and private keys', function() {
            var mockClient = sshMockGet([{ event: 'close', data: 0 }]);
            return commandUtil.sshExec(testCmd, sshSettings, mockClient)
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

            return expect(commandUtil.sshExec(testCmd, sshSettings, mockClient)).to
                .be.rejectedWith(/timed out/);
        });

        it('should reject on ssh error events', function() {
            var error = new Error('ssh error');
            error.level = 'client-ssh'; //may also be 'client-socket'

            var mockClient = sshMockGet();
            mockClient.connect = function() {
                this.emit('error', error);
            };
            return expect(commandUtil.sshExec(testCmd, sshSettings, mockClient)).to
                .be.rejectedWith(/ssh error/);
        });

        it('should reject if underlying ssh returns a remote error', function() {
            var mockClient = sshMockGet(
                [{ event: 'close', data: 0 }],
                new Error('ssh error')
            );

            return expect(commandUtil.sshExec(testCmd, sshSettings, mockClient)).to
                .be.rejected;
        });

        it('should pass sshExec options to the underlying method', function() {
            var events = [
                { data: 'test ' },
                { data: 'string' },
                { event: 'close', data: 0 }
            ];
            var mockClient = sshMockGet(events);
            var sshExecOptions = {
                pty: true
            };

            this.sandbox.spy(mockClient, 'exec');
            return commandUtil.sshExec(testCmd, sshSettings, mockClient, sshExecOptions)
            .then(function() {
                expect(mockClient.exec).to.be.calledWith(testCmd.cmd, sshExecOptions);
            });
        });

        it('should pass an empty object if no sshExecOptions', function() {
            var events = [
                { data: 'test ' },
                { data: 'string' },
                { event: 'close', data: 0 }
            ];
            var mockClient = sshMockGet(events);

            this.sandbox.spy(mockClient, 'exec');
            return commandUtil.sshExec(testCmd, sshSettings, mockClient)
            .then(function() {
                expect(mockClient.exec).to.be.calledWith(testCmd.cmd, {});
            });

        });
    });

    describe('updateLookups', function() {
        var parsedTasks;
        beforeEach(function() {
            parsedTasks = [
                {data: 'data', source: 'test'},
                {data: 'data', source: 'test', lookups: [
                    {mac: 'testMacAddress'}, {mac: 'testMac'}
                ]},
                {data: 'data', source: 'test', lookups: [
                    {ip: 'someIp', mac: 'someMacAddress'}, {ip: 'anIp', mac: 'someMac'}
                ]}
            ];
            commandUtil.buildCommands = sinon.stub().returns([]);
            lookup.setIpAddress = this.sandbox.stub().resolves();
            waterline.lookups.upsertNodeToMacAddress = this.sandbox.stub().resolves();
        });

        it('should setIpAddress given a mac and ip and upsert for just a mac', function() {
            return commandUtil.updateLookups(parsedTasks)
            .then(function() {
                expect(lookup.setIpAddress).to.be.calledTwice.and
                    .calledWithExactly('someIp', 'someMacAddress').and
                    .calledWithExactly('anIp', 'someMac');
                expect(waterline.lookups.upsertNodeToMacAddress).to.be.calledTwice
                    .and.calledWithExactly('fakeNodeId', 'testMacAddress')
                    .and.calledWithExactly('fakeNodeId', 'testMac');
            });
        });
    });

    describe('buildCommands', function() {
        beforeEach(function() {
            commandUtil = new CmdUtil('fakeNodeId');
        });

        afterEach(function() {
            this.sandbox.restore();
        });
        it('shoud take an array of command objects and/or strings and return an array '+
        'of properly formatted command objects', function() {
            var commands = [
                'stringCommand',
                {
                    catalog: {source:'test', format:'json'},
                    command: 'doSomething', retries: 3, acceptedResponseCodes: [0, 127]
                },
                {
                    command: 'runSomething', downloadUrl: 'http://10.0.0.1:8080/api/downloadScript?nodeId=123'
                },
                {
                    command: 'doStuff', timeout: 20 //milliseconds
                }

            ];

            var builtCommands = commandUtil.buildCommands(commands);
            expect(builtCommands[0]).to.deep.equal({cmd: 'stringCommand'});
            expect(builtCommands[1]).to.deep.equal({
                cmd: 'doSomething', catalog: true, source: 'test', format: 'json',
                retries: 3, acceptedResponseCodes: [0, 127]
            });
            expect(builtCommands[2]).to.deep.equal({
                cmd: 'runSomething', downloadUrl: 'http://10.0.0.1:8080/api/downloadScript?nodeId=123'
            });
            expect(builtCommands[3]).to.deep.equal({ cmd: 'doStuff', timeout: 20 });
        });

        it('should take a string and return an array containing a properly '+
        'formatted object', function() {
            expect(commandUtil.buildCommands('string')).to.deep.equal([{cmd: 'string'}]);
        });

        it('should throw an error for unsupported input options', function() {
            var badInput = {command: 'aCommand', junk: 'unsupported'};
            expect(commandUtil.buildCommands.bind(commandUtil, badInput)).to
                .throw(/junk option is not supported/);
        });
    });
});
