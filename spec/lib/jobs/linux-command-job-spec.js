// Copyright 2015, Renasar Technologies Inc.
/* jshint node:true */

'use strict';

describe('Linux Command Job', function () {
    var LinuxCommandJob;
    var uuid;

    before(function() {
        helper.setupInjector(
            _.flatten([
                helper.require('/lib/jobs/base-job'),
                helper.require('/lib/jobs/linux-command'),
                helper.require('/lib/utils/job-utils/command-parser')
            ])
        );

        LinuxCommandJob = helper.injector.get('Job.Linux.Commands');
        uuid = helper.injector.get('uuid');
    });

    describe('baseline behavior', function() {
        var job;

        beforeEach(function() {
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

        it('should delegate requests to handleRequest()', sinon.test(function() {
            this.stub(job, '_subscribeRequestCommands', function(cb) {
                cb();
            });
            this.stub(job, '_subscribeRespondCommands');
            this.stub(job, 'handleRequest');

            job._run();

            expect(job.handleRequest).to.have.been.calledOnce;
        }));

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
    });

    describe('request handling', function() {
        var job;

        beforeEach(function() {
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
});
