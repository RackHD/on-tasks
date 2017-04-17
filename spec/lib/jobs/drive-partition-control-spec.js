// Copyright 2015, EMC, Inc.
/* jshint node:true */

'use strict';

var uuid = require('node-uuid');

describe('Drive Partition Job', function () {
    var DrivePartitionJob;
    var context = { target: '563a015a93a9699004021bdc' };
    var taskId = uuid.v4();
    var job;
    var Promise;

    before(function() {
        helper.setupInjector(
            _.flatten([
                helper.require('/lib/jobs/base-job.js'),
                helper.require('/lib/jobs/drive-partition-control.js')
            ])
        );

        DrivePartitionJob = helper.injector.get('Job.Drive.Partition.Control');
        Promise = helper.injector.get('Promise');
    });

    beforeEach(function() {
        job = new DrivePartitionJob(
            {
                action: 'clear',
                driveIds: ['/dev/disk/by-id/scsi-3123456', '/dev/sdb']
            },
            context,
            taskId
        );
    });

    describe('test constructor', function() {
        it('should create a success instance', function() {
            job = new DrivePartitionJob(
                {
                    action: 'clear',
                    driveIds: ['id0', '/dev/id1']
                },
                {
                    target: 'testId'
                },
                uuid.v4()
            );
            expect(job).to.have.property('nodeId').to.equal('testId');
            expect(job).to.have.property('options').to.have.property('driveIds')
                .to.deep.equal(['id0', '/dev/id1']);
            expect(job).to.have.property('options').to.have.property('action').to.equal('clear');
        });

        it('should throw error if action is not specifed', function() {
            var fn = function() {
                return new DrivePartitionJob(
                    {
                        driveIds: '/dev/sda'
                    },
                    {
                        target: 'testId'
                    },
                    uuid.v4()
                );
            };
            expect(fn).to.throw(Error);
        });

        it('should throw error if no target node from context', function() {
            var fn = function() {
                return new DrivePartitionJob(
                    {
                        driveIds: '/dev/sda',
                        action: 'clear'
                    },
                    {},
                    uuid.v4()
                );
            };
            expect(fn).to.throw(Error);
        });
    });

    describe('test function _findActionHandle', function() {
        var actionName, handleFnName;
        beforeEach(function() {
            actionName = uuid.v4();
            handleFnName = actionName + 'Handle';
            job = new DrivePartitionJob(
                {
                    action: actionName,
                    driveIds: ['/dev/sda', '/dev/sdb']
                },
                context,
                taskId
            );
        });

        afterEach(function() {
            delete job[handleFnName];
        });

        it('should find correct handle function', function() {
            var fn = sinon.stub();
            job[handleFnName] = fn;
            sinon.spy(job, '_findActionHandle');
            var result = job._findActionHandle(actionName);
            expect(result).to.be.instanceof(Function);
            expect(result).to.be.equal(fn);
        });

        it('should throw error if the handler is not a function', function() {
            var testValues = [123, 1.0, 'abc', {a:'b'}, [1,2]];
            testValues.forEach(function(val) {
                job[handleFnName] = val;
                expect(function() {
                    job._findActionHandle(actionName);
                }).to.throw(Error);
            });
        });

        it('should return empty function if not found handler', function() {
            delete job[handleFnName];
            var result = job._findActionHandle(actionName);
            expect(result).to.be.instanceof(Function);
            expect(result.toString()).to.equal((function() {}).toString());
        });
    });

    describe('test function _buildCommands', function() {
        it('should return correct clearing partition command', function() {
            var driveIds = ['/dev/disk/by-id/scsi-12345', '/dev/sdb'];
            var type = 'msdos';
            var tmpJob = new DrivePartitionJob(
                {
                    action: 'clear',
                    driveIds: driveIds,
                    partitionType: type
                },
                context,
                taskId
            );
            var result = tmpJob._buildCommands();
            expect(result).to.deep.equal([
                { cmd: 'sudo parted -s /dev/disk/by-id/scsi-12345 mklabel msdos' },
                { cmd: 'sudo parted -s /dev/sdb mklabel msdos' }
            ]);
        });

        it('should use default gpt partition type', function() {
            var driveIds = ['/dev/disk/by-id/scsi-12345', '/dev/sdb'];
            var tmpJob = new DrivePartitionJob(
                {
                    action: 'clear',
                    driveIds: driveIds,
                },
                context,
                taskId
            );
            var result = tmpJob._buildCommands();
            expect(result).to.deep.equal([
                { cmd: 'sudo parted -s /dev/disk/by-id/scsi-12345 mklabel gpt' },
                { cmd: 'sudo parted -s /dev/sdb mklabel gpt' }
            ]);
        });
    });

    describe('test function _outputParser', function() {
        it('should return success if output is empty', function() {
            var result = job._outputParser('');
            expect(result).to.deep.equal( { error: false } );
        });

        it('should return failure if output is not empty', function() {
            var result = job._outputParser('Error to find device');
            expect(result).to.deep.equal( { error: true } );
        });
    });

    describe('test function handleResponse', function() {
        beforeEach(function() {
            sinon.spy(job, '_outputParser');
        });

        afterEach(function() {
            job._outputParser.restore();
        });

        it('should return correct result if all data is correct', function() {
            var data = {
                tasks: [
                    {
                        cmd: 'example-cmd-0',
                        error: false,
                        stdout: ''
                    },
                    {
                        cmd: 'example-cmd-1',
                        error: false,
                        stdout: ''
                    }
                ]
            };
            var result = job.handleResponse(data, job._outputParser);
            expect(result).to.deep.equal({ error: false, data: [{ error: false }, {error: false}]});
            expect(job._outputParser).to.have.callCount(data.tasks.length);
        });

        it('should return failure if command execution has error', function() {
            var data = {
                tasks: [
                    {
                        cmd: 'example-cmd-0',
                        error: true,
                        stdout: ''
                    },
                    {
                        cmd: 'example-cmd-1',
                        error: false,
                        stdout: ''
                    }
                ]
            };
            var result = job.handleResponse(data, job._outputParser);
            expect(result).to.deep.equal({ error: true });
            expect(job._outputParser).to.have.callCount(0);
        });

        it('should return failure if command stdout is not empty', function() {
            var data = {
                tasks: [
                    {
                        cmd: 'example-cmd-0',
                        error: false,
                        stdout: ''
                    },
                    {
                        cmd: 'example-cmd-1',
                        error: false,
                        stdout: 'error to find the device by id'
                    }
                ]
            };
            var result = job.handleResponse(data, job._outputParser);
            expect(result).to.have.property('error').to.be.true;
            expect(job._outputParser).to.have.callCount(2);
        });

        it('should return the stdout if no parser is specified', function() {
            var data = {
                tasks: [
                    {
                        cmd: 'example-cmd-0',
                        error: false,
                        stdout: ''
                    },
                    {
                        cmd: 'example-cmd-1',
                        error: false,
                        stdout: ''
                    }
                ]
            };
            var result = job.handleResponse(data);
            expect(result).to.have.property('error').to.be.false;
            expect(job._outputParser).to.have.callCount(0);
        });
    });

    describe('test function runRemoteCommand', function() {
        var cmds = ['testcmd1', 'testcmd2'];
        var respData = 'testResp';
        beforeEach(function() {
            sinon.stub(job, '_subscribeRespondCommands', function(callback) {
                callback(respData);
            });
            sinon.stub(job, '_subscribeRequestCommands', sinon.stub());
        });

        afterEach(function() {
            job._subscribeRespondCommands.restore();
            job._subscribeRequestCommands.restore();
        });

        it('should return correct result if input data is valid', function() {
            job.handleResponse = sinon.stub().returns({ error: false });
            return expect(job.runRemoteCommand(cmds, job._outputParser)).to.be.fulfilled;
        });

        it('should return the response data no matter the parser is null', function() {
            job.handleResponse = sinon.stub().returns({ error: false });
            return expect(job.runRemoteCommand(cmds, job._outputParser)).to.be.fulfilled;
        });

        it('should throw error if response returns error', function() {
            job.handleResponse = sinon.stub().returns({ error: true });
            return expect(job.runRemoteCommand(cmds, null)).eventually.be.rejected;
        });

        it('should run normally if response has some delay', function() {
            job.handleResponse = sinon.stub().returns({ error: false });
            job._subscribeRespondCommands.restore();
            sinon.stub(job, '_subscribeRespondCommands', function(callback) {
                setTimeout(function() {
                    callback('');
                }, 60);
            });
            return expect(job.runRemoteCommand(cmds, null, 200)).to.be.fulfilled;
        });

        it('should throw timeout error if fails to get response in limited time', function() {
            job.handleResponse = sinon.stub().returns({ error: false });
            job._subscribeRespondCommands.restore();
            sinon.stub(job, '_subscribeRespondCommands', function(callback) {
                setTimeout(function() {
                    callback(respData);
                }, 1000);
            });
            return expect(job.runRemoteCommand(cmds, null, 50)).to.be.rejectedWith(
                Promise.TimeoutError);
        });
    });

    describe('test function _run', function() {
        beforeEach(function() {
            job = new DrivePartitionJob(
                {
                    action: 'clear',
                    driveIds: ['/dev/disk/by-id/scsi-3123456', '/dev/sdb']
                },
                context,
                taskId
            );
            sinon.stub(job, '_subscribeRequestProperties');
        });

        afterEach(function() {
            job._subscribeRequestProperties.restore();
            job.clearHandle.restore();
        });

        it('should return success in normal case', function() {
            sinon.stub(job, 'clearHandle');
            return expect(job._run()).to.be.fulfilled;
        });

        it('should not throw error if handle function throw error', function() {
            sinon.stub(job, 'clearHandle', sinon.stub().rejects());
            return expect(job._run()).to.be.fulfilled;
        });

        it('should not throw error if not driveIds is specified', function() {
            var tmpJob = new DrivePartitionJob(
                {
                    action: 'clear',
                },
                context,
                taskId
            );
            sinon.stub(tmpJob, '_subscribeRequestProperties');
            sinon.stub(job, 'clearHandle');
            return expect(tmpJob._run()).to.be.fulfilled;
        });
    });
});
