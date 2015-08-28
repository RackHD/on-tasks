// Copyright 2015, Renasar Technologies Inc.
/* jshint node:true */

'use strict';

describe('Linux Command Job', function () {
    var LinuxCommandJob;
    var Logger;
    var Promise;
    var uuid;

    before(function() {
        helper.setupInjector(
            _.flatten([
                helper.require('/lib/jobs/base-job'),
                helper.require('/lib/jobs/linux-command'),
                helper.require('/lib/utils/job-utils/command-parser'),
                helper.di.simpleWrapper({ catalogs:  {} }, 'Services.Waterline')
            ])
        );

        Promise = helper.injector.get('Promise');
        Logger = helper.injector.get('Logger');
        sinon.stub(Logger.prototype, 'log');
        LinuxCommandJob = helper.injector.get('Job.Linux.Commands');
        uuid = helper.injector.get('uuid');
    });

    after(function() {
        Logger.prototype.log.restore();
    });

    describe('instances', function() {
        var job;

        beforeEach('Linux Command Job instances beforeEach', function() {
            job = new LinuxCommandJob({ commands: [] }, { target: 'testid' }, uuid.v4());
        });

        it("should have a nodeId value", function() {
            expect(job.nodeId).to.equal('testid');
        });

        it("should mark hasSentCommands as false", function() {
            expect(job.hasSentCommands).to.equal(false);
        });

        it("should default runOnlyOnce to true", function() {
            expect(job.options.runOnlyOnce).to.equal(true);
        });

        it("should use a user defined runOnlyOnce flag", function() {
            job = new LinuxCommandJob(
                { commands: [], runOnlyOnce: false },
                { target: 'testid' },
                uuid.v4()
            );
            expect(job.options.runOnlyOnce).to.equal(false);
        });
    });

    it('should respond to properties requests', sinon.test(function() {
        var requestPropertiesCallback;
        var options = {
            test: 'options'
        };
        var job = new LinuxCommandJob(options, { target: 'testid' }, uuid.v4());
        this.stub(job, '_subscribeRequestCommands');
        this.stub(job, '_subscribeRespondCommands');
        this.stub(job, '_subscribeRequestProperties', function(_cb) {
            requestPropertiesCallback = _cb;
        });

        job._run();

        expect(requestPropertiesCallback()).to.equal(options);
    }));

    describe('request handling', function() {
        var job;

        beforeEach('Linux Command Job request handling beforeEach', function() {
            var options = {
                commands: [
                    {
                        command: 'test',
                        catalog: { format: 'raw', source: 'test' },
                        acceptedResponseCodes: [1, 127]
                    }
                ]
            };
            job = new LinuxCommandJob(options, { target: 'testid' }, uuid.v4());
            job._subscribeRequestProperties = sinon.stub();
        });

        it('should delegate requests to handleRequest()', sinon.test(function() {
            this.stub(job, '_subscribeRequestCommands', function(cb) {
                cb();
            });
            this.stub(job, '_subscribeRespondCommands');
            this.stub(job, 'handleRequest');

            job._run();

            expect(job.handleRequest).to.have.been.calledOnce;
        }));

        it('should respond to a request with transformed commands', sinon.test(function() {
            expect(job.handleRequest()).to.deep.equal({
                identifier: job.nodeId,
                tasks: job.commands
            });
        }));

        it('should ignore a request if one has already been received', function() {
            job.hasSentCommands = true;
            expect(job.handleRequest()).to.equal(undefined);
        });
    });

    describe('response handling', function() {
        var job;

        before('Linux Command Job response handling before', function() {
            sinon.stub(LinuxCommandJob.prototype, 'catalogUserTasks');
        });

        beforeEach('Linux Command Job response handling beforeEach', function() {
            this.sandbox = sinon.sandbox.create();
            LinuxCommandJob.prototype.catalogUserTasks.reset();
            job = new LinuxCommandJob({ commands: [] }, { target: 'testid' }, uuid.v4());
            job._subscribeRequestProperties = sinon.stub();
        });

        after('Linux Command Job response handling after', function() {
            LinuxCommandJob.prototype.catalogUserTasks.restore();
        });

        afterEach('Linux Command Job response handling afterEach', function() {
            this.sandbox.restore();
        });

        it('should delegate responses to handleResponse() and finish', function(done) {
            this.sandbox.stub(job, '_subscribeRequestCommands');
            this.sandbox.stub(job, '_subscribeRespondCommands', function(cb) {
                cb('test data');
            });
            this.sandbox.stub(job, 'handleResponse').resolves();
            this.sandbox.stub(job, '_done', function(err) {
                if (err) {
                    done(err);
                    return;
                }
                try {
                    expect(job.handleResponse).to.have.been.calledOnce;
                    expect(job.handleResponse).to.have.been.calledWith('test data');
                    done();
                } catch (e) {
                    done(e);
                }
            });

            job._run();
        });

        it('should fail with a handleResponseError if handleResponse rejects', function(done) {
            var handleResponseError = new Error('test handleResponse error');
            this.sandbox.stub(job, '_subscribeRequestCommands');
            this.sandbox.stub(job, '_subscribeRespondCommands', function(cb) {
                cb('test data');
            });

            this.sandbox.stub(job, 'handleResponse').rejects(handleResponseError);

            this.sandbox.stub(job, '_done', function(err) {
                try {
                    expect(err).to.equal(handleResponseError);
                    done();
                } catch (e) {
                    done(e);
                }
            });

            job._run();
        });

        it('should reject on task failure', function() {
            var data = { tasks: [ { error: { code: 1 } } ] };
            return job.handleResponse(data).should.be.rejectedWith(/Encountered a failure/);
        });

        it('should not reject on failure with an accepted response code', function() {
            var data = { tasks: [ { acceptedResponseCodes: [1, 127], error: { code: 127 } } ] };
            return job.handleResponse(data).should.be.fulfilled;
        });

        it('should not try to catalog tasks if none are marked for cataloging', function() {
            var data = { tasks: [ { catalog: false }, { catalog: false } ] };
            return job.handleResponse(data)
            .then(function() {
                expect(job.catalogUserTasks).to.not.have.been.called;
            });
        });

        it('should add catalog responses marked for cataloging', function() {
            var data = { tasks: [ { catalog: true }, { catalog: true }, { catalog: false } ] };
            return job.handleResponse(data)
            .then(function() {
                expect(job.catalogUserTasks).to.have.been.calledWith(
                    [ { catalog: true}, { catalog: true } ]
                );
            });
        });

        it('should bubble up catalogUserTasks rejections', function() {
            var data = { tasks: [ { catalog: true } ] };
            job.catalogUserTasks.rejects(new Error('test rejection error'));
            return job.handleResponse(data).should.be.rejectedWith(/test rejection error/);
        });
    });

    describe('catalogUserTasks', function() {
        var waterline;
        var parser;
        var job;

        before('Linux Command Job catalogUserTasks before', function() {
            waterline = helper.injector.get('Services.Waterline');
            parser = helper.injector.get('JobUtils.CommandParser');
            waterline.catalogs.create = sinon.stub();
            sinon.stub(parser, 'parseUnknownTasks');
        });

        beforeEach('Linux Command Job catalogUserTasks beforeEach', function() {
            waterline.catalogs.create.reset();
            parser.parseUnknownTasks.reset();
            job = new LinuxCommandJob({ commands: [] }, { target: 'testid' }, uuid.v4());
            job._subscribeRequestProperties = sinon.stub();
        });

        after('Linux Command Job catalogUserTasks after', function() {
            parser.parseUnknownTasks.restore();
        });

        it('should create catalog entries for parsed task output', function() {
            parser.parseUnknownTasks.returns(Promise.all([
                {
                    store: true,
                    source: 'test-source-1',
                    data: 'test data 1'
                },
                {
                    store: true,
                    source: undefined,
                    data: 'test data 2'
                },
                {
                    store: false,
                    source: 'test-source-3',
                    data: 'test data 3'
                },
                {
                    error: {},
                    source: 'test-error-source'
                }
            ]));

            return job.catalogUserTasks([])
            .then(function() {
                // Make sure we only catalog objects with store: true and no error
                expect(waterline.catalogs.create).to.have.been.calledTwice;
                expect(waterline.catalogs.create).to.have.been.calledWith({
                    node: job.nodeId,
                    source: 'test-source-1',
                    data: 'test data 1'
                });
                expect(waterline.catalogs.create).to.have.been.calledWith({
                    node: job.nodeId,
                    // Assert that an undefined source gets changed to unknown
                    source: 'unknown',
                    data: 'test data 2'
                });
            });
        });
    });

    it('should transform commands object to schema consumed by bootstrap.js', function() {
        var commands = [
            {
                command: 'test',
                catalog: { format: 'raw', source: 'test' }
            },
            {
                command: 'test 2',
                acceptedResponseCodes: [1, 127]
            }
        ];
        var transformedCommands = LinuxCommandJob.prototype.buildCommands(commands);

        expect(transformedCommands).to.deep.equal([
            {
                cmd: 'test',
                format: 'raw',
                source: 'test',
                catalog: true
            },
            {
                cmd: 'test 2',
                acceptedResponseCodes: [1, 127]
            }
        ]);
    });

    it('should accept an array of strings for commands', function() {
        var commands = [ 'test', 'echo test' ];
        var transformedCommands = LinuxCommandJob.prototype.buildCommands(commands);

        expect(transformedCommands).to.deep.equal([
            {
                cmd: 'test'
            },
            {
                cmd: 'echo test'
            }
        ]);
    });

    it('should accept a multi-typed commands array', function() {
        var commands = [
            'test',
            {
                command: 'echo test'
            }
        ];
        var transformedCommands = LinuxCommandJob.prototype.buildCommands(commands);

        expect(transformedCommands).to.deep.equal([
            {
                cmd: 'test'
            },
            {
                cmd: 'echo test'
            }
        ]);
    });

    it('should accept a downloadUrl for a command', function() {
        var commands = [
            {
                command: './testscript.sh',
                downloadUrl: '/api/current/templates/testscript.sh'
            }
        ];
        var transformedCommands = LinuxCommandJob.prototype.buildCommands(commands);

        expect(transformedCommands).to.deep.equal([
            {
                cmd: './testscript.sh',
                downloadUrl: '/api/current/templates/testscript.sh'
            }
        ]);
    });
});
