// Copyright 2015, Renasar Technologies Inc.
/* jshint node:true */

'use strict';

describe('Linux Command Job', function () {
    var LinuxCommandJob;
    var Logger;
    var uuid;

    before(function() {
        helper.setupInjector(
            _.flatten([
                helper.require('/lib/jobs/base-job'),
                helper.require('/lib/jobs/linux-command'),
                helper.require('/lib/utils/job-utils/command-parser')
            ])
        );

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
            LinuxCommandJob.prototype.catalogUserTasks.reset();
            job = new LinuxCommandJob({ commands: [] }, { target: 'testid' }, uuid.v4());
        });

        after('Linux Command Job response handling after', function() {
            LinuxCommandJob.prototype.catalogUserTasks.restore();
        });

        it('should delegate responses to handleResponse() and finish', sinon.test(function(done) {
            this.stub(job, '_subscribeRequestCommands');
            this.stub(job, '_subscribeRespondCommands', function(cb) {
                cb('test data');
            });
            this.stub(job, 'handleResponse').resolves();
            this.stub(job, '_done');

            job._run();

            try {
                expect(job.handleResponse).to.have.been.calledOnce;
                expect(job.handleResponse).to.have.been.calledWith('test data');
            } catch (e) {
                done(e);
                return;
            }
            process.nextTick(function() {
                try {
                    expect(job._done).to.have.been.calledOnce;
                    done();
                } catch (e) {
                    done(e);
                }
            });
        }));

        it('should reject on task failure', function() {
            var data = { tasks: [ { error: { code: 1 } } ] };
            return job.handleResponse(data).should.be.rejectedWith(/Encountered a failure/);
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
});
