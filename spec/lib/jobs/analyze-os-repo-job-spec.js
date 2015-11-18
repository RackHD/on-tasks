// Copyright 2015, EMC, Inc.
/* jshint node:true */

'use strict';

var uuid = require('node-uuid');

/**
 * Safely to restore the stub
 * if it is a stub then call the restore(); if not, do nothing
 * @param {Object} obj - The input object want to restore stub
 */
function safeRestoreStub(obj) {
    if (obj && 'restore' in obj && _.isFunction(obj.restore)) {
        obj.restore();
    }
}

describe('Analyze OS Repo Job', function () {
    var AnalyzeOsRepoJob;
    var repoTool;
    var context = { target: 'testId' };
    var taskId = uuid.v4();
    var job;
    var repo = 'http://testrepo.com';

    before(function() {
        helper.setupInjector(
            _.flatten([
                helper.require('/lib/jobs/base-job'),
                helper.require('/lib/jobs/analyze-os-repo-job.js'),
                helper.require('/lib/utils/job-utils/os-repo-tool.js')
            ])
        );

        AnalyzeOsRepoJob = helper.injector.get('Job.Os.Analyze.Repo');
        repoTool = helper.injector.get('JobUtils.OsRepoTool');
    });

    describe('analyze esxi repository', function() {
        var esxParseResult = {
            tbootFile: 'http://testrepo.com/tboot.b00',
            mbootFile: 'http://testrepo.com/mboot.c32',
            moduleFiles: 'http://testrepo.com/a.b00 --- http://testrepo.com/ipmi.m0'
        };

        before(function() {
        });

        beforeEach(function() {
            job = new AnalyzeOsRepoJob(
                {
                    version: '6.0',
                    repo: 'http://testrepo.com',
                    osName: 'esx'
                },
                context,
                taskId
            );

            repoTool.downloadViaHttp = sinon.stub();
            repoTool.parseEsxBootCfgFile = sinon.stub();
        });

        afterEach(function() {
            safeRestoreStub(repoTool.downloadViaHttp);
            safeRestoreStub(repoTool.parseEsxBootCfgFile);
            safeRestoreStub(repoTool._esxHandle);
        });

        describe('test function _esxHandle', function() {
            it('should get correct result from boot.cfg', function() {
                repoTool.downloadViaHttp.resolves('');
                repoTool.parseEsxBootCfgFile.returns(esxParseResult);
                return job._esxHandle(repo).then(function(result) {
                    expect(result).to.deep.equal(esxParseResult);
                    expect(repoTool.downloadViaHttp).to.have.callCount(1);
                    expect(repoTool.downloadViaHttp).to.
                        have.been.calledWithExactly(repo + '/boot.cfg');
                    expect(repoTool.parseEsxBootCfgFile).to.have.been.called;
                });
            });

            it('should fetch BOOT.CFG if boot.cfg is not avaiable', function() {
                repoTool.downloadViaHttp.withArgs(repo + '/boot.cfg').rejects();
                repoTool.downloadViaHttp.withArgs(repo + '/BOOT.CFG').resolves();
                repoTool.parseEsxBootCfgFile.returns(esxParseResult);
                return job._esxHandle(repo).then(function(result) {
                    expect(result).to.deep.equal(esxParseResult);
                    expect(repoTool.downloadViaHttp).to.have.callCount(2);
                    expect(repoTool.downloadViaHttp.firstCall.args[0])
                        .to.equal(repo + '/boot.cfg');
                    expect(repoTool.downloadViaHttp.secondCall.args[0])
                        .to.equal(repo + '/BOOT.CFG');
                    expect(repoTool.parseEsxBootCfgFile).to.have.been.called;
                });
            });

            it('should throw error if both boot.cfg and BOOT.CFG is not avaiable', function() {
                repoTool.downloadViaHttp.rejects();
                return expect(job._esxHandle(repo)).eventually.be.rejected;
            });

            describe('test the behavior if boot.cfg misses some required options', function() {
                var keys = ['mbootFile', 'tbootFile', 'moduleFiles'];
                keys.forEach(function(key) {
                    it('should throw error if not have required option [' + key + ']', function() {
                        var data = _.cloneDeep(esxParseResult);
                        delete data[key];
                        repoTool.downloadViaHttp.resolves();
                        repoTool.parseEsxBootCfgFile.returns(data);
                        return expect(job._esxHandle(repo)).eventually.be.rejected;
                    });
                });
            });

            it('should return correct result for normal input', function() {
                job._esxHandle = sinon.stub().resolves(esxParseResult);
                return job._run().then(function() {
                    expect(job).have.property('nodeId').to.equal('testId');
                    expect(job.context).have.property('repoOptions').to.deep.equal(
                        _.merge(esxParseResult, { repo: repo }));
                    expect(job._esxHandle).to.have.been.called;
                });
            });

            it('should not call the esxi handling function if osName is not \'esx\'', function() {
                job = new AnalyzeOsRepoJob(
                    {
                        version: '6.0',
                        repo: 'http://testrepo.com',
                        osName: 'testNotExistedOs'
                    },
                    context,
                    taskId
                );
                job._esxHandle = sinon.stub().resolves(esxParseResult);
                return job._run().then(function() {
                    expect(job._esxHandle).to.not.have.been.called;
                });
            });
        });
    });

    describe('common options conversion', function() {
        it('should convert the repo to correct format', function() {
            job = new AnalyzeOsRepoJob(
                {
                    version: '6.0',
                    repo: 'http://testrepo.com/',
                    osName: 'anyone'
                },
                context,
                taskId
            );
            expect(job.options).have.property('repo').to.equal('http://testrepo.com');
            expect(job).have.property('nodeId').to.equal('testId');
        });

        describe('test the behavior if not have required options', function() {
            var keys = ['repo', 'osName'];
            var options = {
                version: '6.0',
                repo: 'http://testrepo.com',
                osName: 'anyone'
            };
            keys.forEach(function(key) {
                it('should throw assertion error if miss required option [' + key + ']',function() {
                    var tempOptions = _.cloneDeep(options);
                    delete tempOptions[key];
                    expect(function() {
                        new AnalyzeOsRepoJob(tempOptions, context, taskId);
                    }).to.throw(Error);
                });
            });
        });
    });

    describe('test function _findHandle', function() {
        var randOsName, handleFnName;
        beforeEach(function() {
            randOsName = uuid.v4();
            handleFnName = '_' + randOsName + 'Handle';
            job = new AnalyzeOsRepoJob(
                {
                    version: '6.0',
                    repo: 'http://testrepo.com',
                    osName: randOsName
                },
                context,
                taskId
            );
        });

        afterEach(function() {
            delete job[handleFnName];
        });

        it('should find correct handle function', function() {
            job[handleFnName] = sinon.stub();
            sinon.spy(job, '_esxHandle');
            return job._run().then(function() {
                expect(job[handleFnName]).to.have.been.called;
                expect(job['_esxHandle']).to.not.have.been.called;
            });
        });

        it('should throw error if the handler is not a function', function() {
            var testValues = [123, 1.0, 'abc', {a:'b'}, [1,2]];
            testValues.forEach(function(val) {
                job[handleFnName] = val;
                expect(function() {
                    job._findHandle(randOsName);
                }).to.throw(Error);
            });
        });

        it('should return empty function if not found handler', function() {
            delete job[handleFnName];
            var result = job._findHandle(randOsName);
            expect(result).to.be.instanceof(Function);
            expect(result).to.equal(AnalyzeOsRepoJob.prototype._noop);
        });
    });
});
