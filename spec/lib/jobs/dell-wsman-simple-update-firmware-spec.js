// Copyright 2017 Dell Inc. or its subsidiaries.  All Rights Reserved.

'use strict';

var uuid = require('node-uuid');

describe(require('path').basename(__filename), function() {
    var SimpleUpdateFirmwareJob;
    var simpleUpdateFirmwareJob;
    var wsmanBaseJob;
    var wsmanTool;
    var configuration;
    var logger;
    var errorLoggerSpy;
    var fs;
    var ChildProcess;

    var obm = {
        id: '59c4797e70bf1d7c172930dc',
        node: '/api/2.0/nodes/59c4720870bf1d7c172930db',
        service: 'dell-wsman-obm-service',
        config: {
            user: 'admin',
            password: 'admin',
            host: '1.1.1.1'
        }
    };

    var dellConfigs = {
        gateway: 'http://localhost:46010',
        services: {
            firmware: {
                dupUpdater: 'http://localhost:46010/api/1.0/server/firmware/updater/dup',
                updaterStatusApi: 'http://localhost:46010/api/1.0/server/firmware/updater/status'
            }
        }
    };

    before(function() {
        helper.setupInjector([
            helper.require('/lib/utils/job-utils/wsman-tool'),
            helper.require('/lib/jobs/base-job.js'),
            helper.require('/lib/jobs/dell-wsman-base-job.js'),
            helper.require('/lib/jobs/dell-wsman-simple-update-firmware.js')
        ]);
        SimpleUpdateFirmwareJob = helper.injector.get('Job.Dell.Wsman.Simple.Update.Firmware');
        var options = {
                imageURI: 'http://localhost:8080/common/iDRAC.EXE'
            },
            context = {
                graphId: 'fdc41b55-d61d-45c1-9b67-651922e94daa'
            };
        simpleUpdateFirmwareJob = new SimpleUpdateFirmwareJob(options, context, uuid.v4());
        wsmanBaseJob = helper.injector.get('Job.Dell.Wsman.Base');
        wsmanTool = helper.injector.get('JobUtils.WsmanTool');
        configuration = helper.injector.get('Services.Configuration');
        fs = helper.injector.get('fs');
        ChildProcess = helper.injector.get('ChildProcess');
        logger = helper.injector.get('Logger');
        errorLoggerSpy = sinon.spy(logger.prototype, 'error');
        this.sandbox = sinon.sandbox.create();
    });

    beforeEach(function() {
        this.sandbox.stub(wsmanBaseJob.prototype, 'checkOBM');
        this.sandbox.stub(wsmanTool.prototype, 'clientRequest');
        this.sandbox.stub(fs, 'readFile');
        this.sandbox.stub(fs, 'existsSync');
        this.sandbox.stub(fs, 'rmdir');
        this.sandbox.stub(fs, 'mkdirSync');
        this.sandbox.stub(ChildProcess.prototype, 'run');
    });

    afterEach(function() {
        this.sandbox.restore();
    });

    describe('_initJob', function() {
        beforeEach(function() {
            this.sandbox.stub(configuration, 'get');
            this.sandbox.stub(SimpleUpdateFirmwareJob.prototype, 'getComponentId');
        });

        it('should handle: imageURI is empty', function() {
            var options = {
                imageURI: ''
            };
            var context = {
                graphId: 'fdc41b55-d61d-45c1-9b67-651922e94daa'
            };
            var job = new SimpleUpdateFirmwareJob(options, context, uuid.v4());
            return expect(job._initJob()).to.be.rejectedWith('imageURI is invalid.');
        });

        it('should handle the case of lacking dell configuration', function() {
            configuration.get.withArgs('dell').returns(undefined);
            return expect(simpleUpdateFirmwareJob._initJob()).to
                .be.rejectedWith('Dell firmware update SMI service is not defined in smiConfig.json.');
        });

        it('should handle the case of incorrect obm setting is invalid', function() {
            SimpleUpdateFirmwareJob.prototype.checkOBM.resolves({});
            configuration.get.withArgs('dell').returns(dellConfigs);
            return expect(simpleUpdateFirmwareJob._initJob()).to.be.rejectedWith('Dell obm setting is invalid.');
        });

        it('should handle: dup updater api is not defined in smiConfig.json', function() {
            var invalidDellConfigs = {
                gateway: 'http://localhost:46011',
                services: {
                    firmware: {
                        dupUpdater: ''
                    }
                }
            };
            configuration.get.withArgs('dell').returns(invalidDellConfigs);
            return expect(simpleUpdateFirmwareJob._initJob()).to
                .be.rejectedWith('Firmware dup updater is not defined in smiConfig.json.');
        });

        it('should handle: updater status api is not defined in smiConfig.json', function() {
            var invalidDellConfigs = {
                gateway: 'http://localhost:46011',
                services: {
                    firmware: {
                        dupUpdater: 'http://localhost:46010/api/1.0/server/firmware/updater/dup',
                        updaterStatusApi: ''
                    }
                }
            };
            configuration.get.withArgs('dell').returns(invalidDellConfigs);
            return expect(simpleUpdateFirmwareJob._initJob()).to
                .be.rejectedWith('Firmware updater status api is not defined in smiConfig.json.');
        });

        it('should init job correctly', function() {
            configuration.get.withArgs('dell').returns(dellConfigs);
            wsmanBaseJob.prototype.checkOBM.resolves(obm);
            return simpleUpdateFirmwareJob._initJob().then(function() {
                expect(simpleUpdateFirmwareJob.targetConfig.username).to.equal('admin');
                expect(simpleUpdateFirmwareJob.firmwareConfigs.dupUpdater).to
                    .equal('http://localhost:46010/api/1.0/server/firmware/updater/dup');
            });
        });
    });

    describe('getComponentId', function() {
        beforeEach(function() {
            this.sandbox.stub(ChildProcess.prototype, '_parseCommandPath').returns('fake script file path');
        });

        it('should get component correctly', function() {
            fs.existsSync.withArgs('/tmp').returns(false);
            fs.existsSync.withArgs('/tmp/fdc41b55-d61d-45c1-9b67-651922e94daa').returns(false);
            var fakeXml = '<Device componentID="159" embedded="1"><Display lang="en"><![[TEST]]></Display></Device>';
            fs.readFile.yields(null, fakeXml);
            return simpleUpdateFirmwareJob.getComponentId().then(function() {
                expect(simpleUpdateFirmwareJob.componentIds).to.include('159');
                expect(ChildProcess.prototype.run).to.have.been.called.twice;
            });
        });

        it('should create tmp folder and get component id correctly', function() {
            fs.existsSync.withArgs('/tmp').returns(true);
            fs.existsSync.withArgs('/tmp/fdc41b55-d61d-45c1-9b67-651922e94daa').returns(false);
            var fakeXml = '<Device componentID="159" embedded="1"><Display lang="en"><![[test]]></Display></Device>';
            fs.readFile.yields(null, fakeXml);
            return simpleUpdateFirmwareJob.getComponentId().then(function() {
                expect(simpleUpdateFirmwareJob.componentIds).to.include('159');
                expect(ChildProcess.prototype.run).to.have.been.called.quartic;
            });
        });

        it('should handle: error occurs while reading package.xml', function() {
            fs.existsSync.withArgs('/tmp').returns(true);
            fs.existsSync.withArgs('/tmp/fdc41b55-d61d-45c1-9b67-651922e94daa').returns(false);
            fs.readFile.yields(new Error('fake error'), '');
            return expect(simpleUpdateFirmwareJob.getComponentId()).to.be.rejectedWith('fake error');
        });

        it('should handle: invalid xml content', function() {
            fs.existsSync.withArgs('/tmp').returns(true);
            fs.existsSync.withArgs('/tmp/fdc41b55-d61d-45c1-9b67-651922e94daa').returns(false);
            var invalidXml = '<SoftwareComponent dateTime="2017-01-10T02:46:46-06:00"></SoftwareComponent>';
            fs.readFile.yields(null, invalidXml);
            return expect(simpleUpdateFirmwareJob.getComponentId()).to.
                be.rejectedWith('Could not found any device tag in package.xml.');
        });
    });

    describe('_handleAsyncRequest', function(){
        beforeEach(function() {
            this.sandbox.stub(wsmanBaseJob.prototype, '_done');
            this.sandbox.stub(SimpleUpdateFirmwareJob.prototype, 'UpdateFirmware');
            this.sandbox.stub(SimpleUpdateFirmwareJob.prototype, 'DeleteDownloadImage');
        });

        it('should handle: firmware update job is failed.', function() {
            SimpleUpdateFirmwareJob.prototype.UpdateFirmware = function() {
                return Promise.try(function() {
                    simpleUpdateFirmwareJob.jobSucceed = false;
                });
            };
            var error = new Error("Failed to update firmware. Server: 1.1.1.1");
            return simpleUpdateFirmwareJob._handleAsyncRequest().then(function() {
                expect(wsmanBaseJob.prototype._done).to.be.calledWith(error);
            });
        });

        it('should handle: job succceed', function() {
            simpleUpdateFirmwareJob.jobSucceed = true;
            SimpleUpdateFirmwareJob.prototype.UpdateFirmware = function() {
                return Promise.try(function() {
                    simpleUpdateFirmwareJob.jobSucceed = true;
                });
            };
            return simpleUpdateFirmwareJob._handleAsyncRequest().then(function() {
                expect(wsmanBaseJob.prototype._done).to.be.calledOnce;
            });
        });
    });

    describe('UpdateFirmware', function() {
        beforeEach(function() {
            simpleUpdateFirmwareJob.jobSucceed = false;
            simpleUpdateFirmwareJob.firmwareConfigs = {
                dupUpdater: 'http://localhost:46010/api/1.0/server/firmware/updater/dup'
            };
            this.sandbox.stub(SimpleUpdateFirmwareJob.prototype, 'SendClientRequest');
        });

        it('should pass test update multi-component case', function() {
            simpleUpdateFirmwareJob.componentIds = [ 1, 2 ];
            SimpleUpdateFirmwareJob.prototype.SendClientRequest.resolves('Completed');
            return simpleUpdateFirmwareJob.UpdateFirmware().then(() => {
                expect(simpleUpdateFirmwareJob.jobSucceed).to.equal(true);
            });
        });

        it('should pass test single-component case', function() {
            simpleUpdateFirmwareJob.componentIds = [ 1 ];
            SimpleUpdateFirmwareJob.prototype.SendClientRequest.resolves('Failed');
            return simpleUpdateFirmwareJob.UpdateFirmware().then(() => {
                expect(simpleUpdateFirmwareJob.jobSucceed).to.equal(false);
            });
        });

        it('should test update multi-component case', function() {
            simpleUpdateFirmwareJob.componentIds = [ 1, 2 ];
            var switcher = true;
            SimpleUpdateFirmwareJob.prototype.SendClientRequest = () => {
                return Promise.try(function() {
                    if(switcher) {
                        switcher = false;
                        return 'Completed';
                    } else {
                        return 'Failed';
                    }
                });
            };
            return simpleUpdateFirmwareJob.UpdateFirmware().then(() => {
                expect(simpleUpdateFirmwareJob.jobSucceed).to.equal(true);
            });
        });

        it('should handle: error occurs while sending request', function() {
            simpleUpdateFirmwareJob.componentIds = [ 1, 2 ];
            SimpleUpdateFirmwareJob.prototype.SendClientRequest.rejects('fake error');
            return simpleUpdateFirmwareJob.UpdateFirmware().then(() => {
                expect(simpleUpdateFirmwareJob.jobSucceed).to.equal(false);
            });
        });
    });

    describe('SendClientRequest', function() {
        beforeEach(function() {
        });

        it('should handle job status returned in dup response: JID Failed, RID Pending', function() {
            wsmanTool.prototype.clientRequest.resolves({
                body: [
                    { jobId: 'JID_xxx', status: 'Failed' },
                    { jobId: 'RID_xxx', status: 'Pending Reboot' }
                ]
            });
            var host = 'http://localhost:46010',
                path = '/api/1.0/server/firmware/updater/dup',
                method = 'POST',
                data = {};
            return simpleUpdateFirmwareJob.SendClientRequest(host, path, method, data)
                .then((result) => {
                    expect(result).to.equal('Failed');
                });
        });

        it('should handle job status returned in dup response: JID Completed, RID Failed', function() {
            wsmanTool.prototype.clientRequest.resolves({
                body: [
                    { jobId: 'JID_xxx', status: 'Completed' },
                    { jobId: 'RID_xxx', status: 'Failed' }
                ]
            });
            var host = 'http://localhost:46010',
                path = '/api/1.0/server/firmware/updater/dup',
                method = 'POST',
                data = {};
            return simpleUpdateFirmwareJob.SendClientRequest(host, path, method, data)
                .then((result) => {
                    expect(result).to.equal('Failed');
                });
        });

        it('should handle job status returned in dup response: JID Completed, RID Completed', function() {
            wsmanTool.prototype.clientRequest.resolves({
                body: [
                    { jobId: 'JID_xxx', status: 'Completed' },
                    { jobId: 'RID_xxx', status: 'Completed' }
                ]
            });
            var host = 'http://localhost:46010',
                path = '/api/1.0/server/firmware/updater/dup',
                method = 'POST',
                data = {};
            return simpleUpdateFirmwareJob.SendClientRequest(host, path, method, data)
                .then((result) => {
                    expect(result).to.equal('Completed');
                });
        });

        it('should handle job status returned in dup response: JID Completed, RID Pending', function() {
            wsmanTool.prototype.clientRequest.resolves({
                body: [
                    { jobId: 'JID_xxx', status: 'Completed' },
                    { jobId: 'RID_xxx', status: 'Pending Reboot' }
                ]
            });
            this.sandbox.stub(SimpleUpdateFirmwareJob.prototype, 'PollJobStatus').resolves('Completed');
            var host = 'http://localhost:46010',
                path = '/api/1.0/server/firmware/updater/dup',
                method = 'POST',
                data = {};
            return simpleUpdateFirmwareJob.SendClientRequest(host, path, method, data)
                .then((result) => {
                    expect(result).to.equal('Completed');
                });
        });

        it('should handle job status returned in dup response: JID Downloading, RID Pending', function() {
            wsmanTool.prototype.clientRequest.resolves({
                body: [
                    { jobId: 'JID_xxx', status: 'Downloading' },
                    { jobId: 'RID_xxx', status: 'Pending Reboot' }
                ]
            });
            var host = 'http://localhost:46010',
                path = '/api/1.0/server/firmware/updater/dup',
                method = 'POST',
                data = {};
            this.sandbox.stub(SimpleUpdateFirmwareJob.prototype, 'PollJobStatus').resolves('Completed');
            return simpleUpdateFirmwareJob.SendClientRequest(host, path, method, data)
                .then((result) => {
                    expect(result).to.equal('Completed');
                });
        });

        it('should handle: poll JID Failed', function() {
            wsmanTool.prototype.clientRequest.resolves({
                body: [
                    { jobId: 'JID_xxx', status: 'Downloading' },
                    { jobId: 'RID_xxx', status: 'Pending Reboot' }
                ]
            });
            var host = 'http://localhost:46010',
                path = '/api/1.0/server/firmware/updater/dup',
                method = 'POST',
                data = {};
            this.sandbox.stub(SimpleUpdateFirmwareJob.prototype, 'PollJobStatus').resolves('Failed');
            return simpleUpdateFirmwareJob.SendClientRequest(host, path, method, data)
                .then((result) => {
                    expect(result).to.equal('Failed');
                });
        });


        it('should handle: poll JID Completed , RID Failed', function() {
            wsmanTool.prototype.clientRequest.resolves({
                body: [
                    { jobId: 'JID_xxx', status: 'Downloading' },
                    { jobId: 'RID_xxx', status: 'Pending Reboot' }
                ]
            });
            var host = 'http://localhost:46010',
                path = '/api/1.0/server/firmware/updater/dup',
                method = 'POST',
                data = {};
            var switcher = false;
            this.sandbox.stub(SimpleUpdateFirmwareJob.prototype, 'PollJobStatus', function() {
                return Promise.try(function() {
                    if(switcher) {
                        return 'Failed';
                    } else {
                        switcher = true;
                        return 'Completed';
                    }
                });
            });
            return simpleUpdateFirmwareJob.SendClientRequest(host, path, method, data)
                .then((result) => {
                    expect(result).to.equal('Failed');
                });
        });
    });

    describe('PollJobStatus', function() {
        beforeEach(function() {
            simpleUpdateFirmwareJob.firmwareConfigs = {
                updaterStatusApi: 'http://localhost:46010/api/1.0/server/firmware/updater/dup'
            };
            simpleUpdateFirmwareJob.apiServer = '1.1.1.1';
        });

        it('should return correct job status: Failed', function() {
            wsmanTool.prototype.clientRequest.resolves({
                body: [
                    {
                        jobId: 'JID_xxx',
                        status: 'Completed'
                    }
                ]
            });
            return simpleUpdateFirmwareJob.PollJobStatus('JID_xxx', 2000, 1)
                .then(function(status) {
                    expect(status).to.equal('Completed');
                });
        });

        it('should return correct job status: Failed', function() {
            wsmanTool.prototype.clientRequest.resolves({
                body: [
                    {
                        jobId: 'JID_xxx',
                        status: 'Failed'
                    }
                ]
            });
            return simpleUpdateFirmwareJob.PollJobStatus('JID_xxx', 2000, 1)
                .then(function(status) {
                    expect(status).to.equal('Failed');
                });
        });

        it('should loop polling correctly', function() {
            var times = 0;
            wsmanTool.prototype.clientRequest.restore();
            this.sandbox.stub(wsmanTool.prototype, 'clientRequest', function() {
                return Promise.try(function() {
                    if(times > 0) {
                        return {
                            body: [
                                {
                                    jobId: 'JID_xxx',
                                    status: 'Failed'
                                }
                            ]
                        };
                    } else {
                        times++ //jshint ignore:line
                        return {
                            body: [
                                {
                                    jobId: 'JID_xxx',
                                    status: 'Downloading'
                                }
                            ]
                        };
                    }
                });
            });
            return simpleUpdateFirmwareJob.PollJobStatus('JID_xxx', 2000, 1)
                .then(function(status) {
                    expect(status).to.equal('Failed');
                    expect(wsmanTool.prototype.clientRequest).to.be.calledTwice;
                });
        });

        it('should end loop polling correctly after timeout', function() {
            wsmanTool.prototype.clientRequest.resolves({
                body: [
                    {
                        jobId: 'JID_xxx',
                        status: 'Downloading'
                    }
                ]
            });
            return simpleUpdateFirmwareJob.PollJobStatus('JID_xxx', 4, 1)
                .then(function(status) {
                    expect(status).to.equal('Failed');
                });
        });

        it('should end loop polling correctly if error occurs', function() {
            wsmanTool.prototype.clientRequest.rejects('fake error');
            return simpleUpdateFirmwareJob.PollJobStatus('JID_xxx', 2000, 1)
                .then(function(status) {
                    expect(status).to.equal('Failed');
                    var err = new Error('fake error');
                    expect(errorLoggerSpy).to.be.calledWith('An error occurred while polling job status.',
                        { error: err });
                });
        });
    });

    describe('DeleteDownloadImage', function() {
        beforeEach(function() {
            fs.existsSync.resolves(true);
        });

        it('should delete download image and package.xml correcly', function() {
            errorLoggerSpy.reset();
            simpleUpdateFirmwareJob.DeleteDownloadImage();
            return expect(errorLoggerSpy).to.not.be.called;
        });

        it('should handle: error occured while deleting temp folder', function() {
            errorLoggerSpy.reset();
            fs.rmdir.yields(new Error('fake error'));
            simpleUpdateFirmwareJob.DeleteDownloadImage();
            return expect(errorLoggerSpy).to.have.been.calledOnce;
        });
    });
});
