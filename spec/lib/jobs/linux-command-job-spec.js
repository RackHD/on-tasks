// Copyright 2015, EMC, Inc.
/* jshint node:true */

'use strict';

describe('Linux Command Job', function () {
    var LinuxCommandJob;
    var Logger;
    var Promise;
    var uuid;

    var commandUtil = {};
    function CommandUtil() { return commandUtil; }

    before(function() {
        helper.setupInjector(
            _.flattenDeep([
                helper.require('/lib/jobs/base-job'),
                helper.require('/lib/jobs/linux-command'),
                helper.require('/lib/utils/job-utils/command-parser'),
                helper.di.simpleWrapper(CommandUtil, 'JobUtils.Commands'),
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
            commandUtil.buildCommands = sinon.stub().returns([]);
            job = new LinuxCommandJob({ commands: [] }, { target: 'testid' }, uuid.v4());
        });

        it('should have a property "commandUtil"', function() {
            expect(job).to.have.property('commandUtil');
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
        commandUtil.buildCommands = sinon.stub().returns([]);
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
                        command: 'test'
                    }
                ]
            };
            commandUtil.buildCommands = sinon.stub().returns([{cmd: 'test'}]);
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

        it('should return an object with nodeId once if runOnlyOnce is true', function() {
            expect(job.handleRequest()).to.deep.equal({
                identifier: 'testid',
                tasks: [{cmd: 'test'}]
            });
            expect(job.handleRequest()).to.equal(undefined);
        });

        it('should always send commands if runOnlyOnce is false', function() {
            job.options.runOnlyOnce = false;
            expect(job.handleRequest()).to.deep.equal({
                identifier: 'testid',
                tasks: [{cmd: 'test'}]
            });
            expect(job.handleRequest()).to.deep.equal({
                identifier: 'testid',
                tasks: [{cmd: 'test'}]
            });
        });

    });

    describe('response handling', function() {
        var job, testData;

        beforeEach('Linux Command Job response handling before', function() {
            this.sandbox = sinon.sandbox.create();
            testData = {stdout: 'test data', cmd: 'test command'};
            commandUtil.buildCommands = this.sandbox.stub().returns([]);
            commandUtil.handleRemoteFailure = this.sandbox.stub().resolves([testData]);
            commandUtil.parseUnknownTasks = this.sandbox.stub().resolves([
                {data: 'parsed test data', source: 'test command'}
            ]);
            commandUtil.catalogParsedTasks = this.sandbox.stub().resolves([]);
            job = new LinuxCommandJob({ commands: [] }, { target: 'testid' }, uuid.v4());
            job._subscribeRequestProperties = sinon.stub();
            this.sandbox.stub(job, '_subscribeRequestCommands');
            this.sandbox.stub(job, '_subscribeRespondCommands', function(cb) {
                cb(testData);
            });
        });

        afterEach('Linux Command Job response handling afterEach', function() {
            this.sandbox.restore();
        });

        it('should delegate responses to commandUtil.parseUnknownTasks() and finish',
        function(done) {

            this.sandbox.stub(job, '_done', function(err) {
                if (err) {
                    done(err);
                    return;
                }
                try {
                    expect(commandUtil.parseUnknownTasks).to.have.been.calledOnce
                        .and.calledWith([testData]);
                    done();
                } catch (e) {
                    done(e);
                }
            });

            job._run();
        });

        it('should finish with error on remote error', function(done) {
            var error = new Error('remote error');
            commandUtil.handleRemoteFailure.rejects(error);
            this.sandbox.stub(job, '_done', function(err) {
                try {
                    expect(err).to.equal(error);
                    done();
                } catch (e) {
                    done(e);
                }
            });
            job._run();
        });
    });
});
