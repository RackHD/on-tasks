// Copyright © 2017 Dell Inc. or its subsidiaries.  All Rights Reserved.
/* jshint node: true */

'use strict';

describe("download-file", function () {
    var instance, downloadFile, uuid, fs;

    var mockChildProcessFactory = function () {
        function MockChildProcess(command, args, env) {
            this.command = command;
            this.args = args;
            this.env = env;
        }

        MockChildProcess.prototype.run = function () {
            var self = this;
            var args = self.args;

            if (args[0] === 'http://badLocation') {
                return Promise.reject({
                    stderr: 'Download failed'
                });
            } else {
                return Promise.resolve({
                    stdout: 'Downloaded file'
                });
            }
        };
        return MockChildProcess;
    };

    before('download file before', function () {
        helper.setupInjector([
            helper.require('/lib/jobs/base-job'),
            helper.require('/lib/jobs/download-file'),
            helper.require('/lib/utils/job-utils/os-repo-tool'),
            helper.di.simpleWrapper(mockChildProcessFactory(), 'ChildProcess')
        ]);
        downloadFile = helper.injector.get('Job.Download.File');
        uuid = helper.injector.get('uuid');
        fs = helper.injector.get('fs');
    });


    before(function () {
        instance = new downloadFile({filePath: ''}, {}, uuid.v4());
        this.sandbox = sinon.sandbox.create();
    });

    describe('runCommand', function () {
        var fsExist;
        beforeEach('runCommand before', function() {
            fsExist = this.sandbox.stub(fs, 'existsSync');
        });
        afterEach('runCommand after', function () {
            this.sandbox.restore();
        });

        it('should resolve on success', function () {
            this.sandbox.spy(instance, '_done');
            instance.options.filePath = 'http://somefile';
            instance.options.serverFilePath = 'local/server/pathTo/somefile';
            return instance._run()
                .then(function () {
                    expect(instance._run).to.be.resolved;
                    expect(fs.existsSync).to.be.calledOnce;
                    expect(instance._done).to.be.calledWith();
                });
        });

        it('should error on failure', function () {
            this.sandbox.spy(instance, '_done');
            instance.options.filePath = 'http://badLocation';
            instance.options.serverFilePath = 'local/server/pathTo/somefile';
            return instance._run()
                .then(function () {
                    expect(instance._run).to.not.be.resolved;
                    expect(instance._done).to.be.calledWith({stderr: 'Download failed'});
                });
        });

        it('should call done on success', function () {
            this.sandbox.spy(instance, '_done');
            instance.options.filePath = 'somefile';
            return instance._run()
                .then(function () {
                    expect(instance._run).to.be.resolved;
                    expect(instance._done).to.be.calledWith();
                });
        });

    });
});
