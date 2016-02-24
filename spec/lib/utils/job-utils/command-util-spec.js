// Copyright 2015, EMC, Inc.

'use strict';

describe('Command Util', function() {
    var waterline = { catalogs: {} },
        parser = {},
        CmdUtil,
        commandUtil;

    before(function() {
        helper.setupInjector([
            helper.require('/lib/utils/job-utils/command-util.js'),
            helper.di.simpleWrapper(parser, 'JobUtils.CommandParser'),
            helper.di.simpleWrapper(waterline, 'Services.Waterline')
        ]);

        CmdUtil = helper.injector.get('JobUtils.Commands');
        this.sandbox = sinon.sandbox.create();
    });

    describe('parseResponse', function() {
        function getParsedTask() {
            return { store: true, source: 'test', data: 'parsedData' };
        }

        beforeEach(function() {
            commandUtil = new CmdUtil('fakeNodeId');
            this.sandbox.stub(commandUtil, 'catalogParsedTasks');

            parser.parseTasks = this.sandbox.stub().resolves();
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
            parser.parseTasks.resolves(new Array(3).map(getParsedTask));
            return commandUtil.parseResponse(tasks)
            .then(function() {
                expect(parser.parseTasks).to.have.been.calledOnce;
                expect(parser.parseUnknownTasks).to.have.been.calledOnce;
            });
        });

        it('should bubble up parsing errors', function() {
            var tasks = [
                {stdout: 'data', cmd: 'remoteCommand', catalog: true},
                {stdout: 'data', cmd: 'remoteCommand', catalog: true},
                {stdout: 'data', cmd: 'remoteCommand', catalog: true}
            ];
            parser.parseTasks.rejects(new Error('parsing error'));
            return expect(commandUtil.parseResponse(tasks)).to.be.rejectedWith(/parsing error/);
        });

        it('should only parse tasks marked for cataloging', function() {
            var tasks = [
                {stdout: 'data', catalog: false, cmd: 'test'},
                {stdout: 'data', catalog: true, cmd: 'test'}
            ];

            return commandUtil.parseResponse(tasks)
            .then(function() {
                expect(parser.parseTasks.args[0][0]).to.include(tasks[1]);
                expect(parser.parseTasks.args[0][0]).to.not.include(tasks[0]);
            });
        });

        it('should call parseUnknownTasks for tasks with a "format" key and '+
        'call parseTasks otherwise', function() {
            var tasks = [
                {stdout: 'json', catalog: true, cmd: 'getSomeJson', format: 'json'},
                {stdout: 'data', catalog: true, cmd: 'getSomeData'}
            ];

            return commandUtil.parseResponse(tasks)
            .then(function() {
                expect(parser.parseTasks).to.have.been.calledWithExactly([tasks[1]]);
                expect(parser.parseUnknownTasks).to.have.been.calledWithExactly([tasks[0]]);
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
                    command: 'runSomething', downloadUrl: 'api/downloadScript'
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
                cmd: 'runSomething', downloadUrl: 'api/downloadScript'
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
