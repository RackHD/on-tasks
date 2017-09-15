// Copyright 2017, Dell EMC, Inc.

'use strict';

var uuid = require('node-uuid');
describe('update firmware by diag', function(){
    var job;
    var UpdatefirmwareJob;
    var taskId = uuid.v4();
    var nodeId = uuid.v4();
    var context = {target: nodeId, nodeIp: "172.31.128.6"};
    var options = {
        imageUrl: "http://172.31.128.1:9080/emc_c_bios_oberon_5042.bin",
        imageName: "emc_c_bios_oberon_5042.bin",
        firmwareType: 'spi'
    };
    var updateBiosResult = {
        "result": [
            {
                "atomic_test_start": {
                    "timestamp": "2017-06-19 11:42:26.900028"
                }
            },
            {
                "atomic_test_data": {
                    "secure_firmware_update": "Issue warm reset NOW!",
                    "timestamp": "2017-06-19 11:42:27.035284"
                }
            },
            {
                "atomic_test_end": {
                    "timestamp": "2017-06-19 11:42:27.035543"
                }
            }
        ]
    };
    var updateBiosFailResult = {
        "result": [
            {
                "error": {
                    "device_name": "SPIROM",
                    "error_code": "1000000080020301",
                    "error_detail": [
                        "CoreId: 8",
                        "Update firmware got an exception"
                    ],
                    "error_group": "Errors",
                    "guid": "07dc05d4-6d87-11e7-89a1-0060166fb462",
                    "timestamp": "2017-07-20 20:23:46.440809"
                }
            },
            {
               "atomic_test_end": {
                    "timestamp": "2017-07-20 20:23:46.445271"
                }
            }
        ]
    };
    var sandbox = sinon.sandbox.create();
    var diagTool = {};
    function DiagTool() {return diagTool;}

    before(function(){
        helper.setupInjector([
            helper.require('/lib/jobs/base-job.js'),
            helper.require('/lib/jobs/emc-diag-update-firmware.js'),
            helper.di.simpleWrapper(DiagTool, 'JobUtils.DiagTool')
        ]);
        UpdatefirmwareJob = helper.injector.get('Job.Emc.Diag.Update.Firmware');
    });

    beforeEach('diag firmware update before each', function(){
        diagTool = {
            uploadImageFile: sandbox.stub().resolves(),
            retrySyncDiscovery: sandbox.stub().resolves(),
            updateFirmware: sandbox.stub().resolves(),
            getAllDevices: sandbox.stub().resolves(),
            warmReset: sandbox.stub().resolves(),
            bmcReset: sandbox.stub().resolves()
        };
    });

    after('diag firmware update after', function(){
        sandbox.restore();
    });

    it('should throw invalid IP error', function() {
        var _context = _.cloneDeep(context);
        _context.nodeIp = '10.1.1.';
        job = new UpdatefirmwareJob(options, _context, taskId);
        sandbox.stub(job, '_done').resolves();
        return job._run()
        .then(function(){
            expect(diagTool.retrySyncDiscovery).to.not.be.called;
            expect(job._done).to.be.calledOnce;
            expect(job._done.args[0][0].message).to.equal(
                'Violated isIP constraint (10.1.1.,4).'
            );
        });
    });

    describe('bios update', function(){
        beforeEach('diag bios update before each', function(){
            diagTool.updateFirmware.resolves(updateBiosResult);
        });

        it('should run update bios job with integer mode and reset', function() {
            var _options = _.defaults({firmwareType: 'spi', imageMode: 1}, options);
            job = new UpdatefirmwareJob(_options, context, taskId);
            sandbox.spy(job, '_done');
            return job._run()
            .then(function(){
                expect(diagTool.retrySyncDiscovery).to.be.calledOnce;
                expect(diagTool.getAllDevices).to.be.calledOnce;
                expect(diagTool.uploadImageFile).to.be.calledOnce;
                expect(diagTool.updateFirmware).to.be.calledOnce;
                expect(diagTool.warmReset).to.be.calledOnce;
                expect(job._done).to.be.calledOnce;
                expect(diagTool.retrySyncDiscovery).to.be.calledWith(5000, 6);
                expect(diagTool.uploadImageFile).to.be.calledWith(options.imageUrl, options.imageName);
                expect(diagTool.updateFirmware).to.be.calledWith(
                    'spi',
                    options.imageName,
                    '1',
                    '/uploads'
                );
                expect(diagTool.warmReset).to.be.calledWith(false);
            });
        });

        it('should run update bios job with mode name and without reset', function() {
            var _options = _.defaults({firmwareType: 'spi', imageMode: 'bios', skipReset: true}, options);
            job = new UpdatefirmwareJob(_options, context, taskId);
            sandbox.spy(job, '_done');
            return job._run()
            .then(function(){
                expect(diagTool.updateFirmware).to.be.calledWith(
                    'spi',
                    options.imageName,
                    '1',
                    '/uploads'
                );
                expect(job._done).to.be.calledOnce;
                expect(diagTool.warmReset).to.not.be.called;
            });
        });

        it('should throw reset flag is incorrect error', function() {
            var _options = _.defaults({imageMode: '1'}, options);
            job = new UpdatefirmwareJob(_options, context, taskId);
            sandbox.stub(job, '_done').resolves();
            updateBiosResult.result[1].atomic_test_data.secure_firmware_update = '';
            diagTool.updateFirmware.reset();
            return job._run()
            .then(function(){
                expect(job._done).to.be.calledOnce;
                expect(job._done.args[0][0].message).to.equal(
                    'Failed to get reset flags from diag'
                );
            });
        });

        it('should throw firmware update error', function() {
            var _options = _.defaults({imageMode: '1'}, options);
            job = new UpdatefirmwareJob(_options, context, taskId);
            sandbox.stub(job, '_done').resolves();
            updateBiosResult.result[1].atomic_test_data.secure_firmware_update = '';
            diagTool.updateFirmware.reset();
            diagTool.updateFirmware.resolves(updateBiosFailResult);
            return job._run()
            .then(function(){
                expect(job._done).to.be.calledOnce;
                expect(job._done.args[0][0].message).to.equal(
                    'Failed to get reset flags from diag'
                );
            });
        });
    });

    describe('bmc update', function(){
        it('should run update bmc firmware job', function() {
            var _options = _.defaults({firmwareType: 'bmc', imageMode: '0x5f'}, options);
            job = new UpdatefirmwareJob(_options, context, taskId);
            sandbox.spy(job, '_done');
            return job._run()
            .then(function(){
                expect(diagTool.retrySyncDiscovery).to.be.calledOnce;
                expect(diagTool.getAllDevices).to.be.calledOnce;
                expect(diagTool.uploadImageFile).to.be.calledOnce;
                expect(diagTool.updateFirmware).to.be.calledOnce;
                expect(diagTool.bmcReset).to.be.calledOnce;
                expect(job._done).to.be.calledOnce;
                expect(diagTool.retrySyncDiscovery).to.be.calledWith(5000, 6);
                expect(diagTool.uploadImageFile).to.be.calledWith(options.imageUrl, options.imageName);
                expect(diagTool.updateFirmware).to.be.calledWith(
                    'bmc',
                    options.imageName,
                    '0x5f',
                    '/uploads'
                );
                expect(diagTool.bmcReset).to.be.calledWith(false);
            });
        });

        it('should run update bmc firmware job with mode name and without reset', function() {
            var _options = _.defaults(
                {firmwareType: 'bmc', imageMode: 'fullbmc', skipReset: true},
                options
            );
            job = new UpdatefirmwareJob(_options, context, taskId);
            sandbox.spy(job, '_done');
            return job._run()
            .then(function(){
                expect(job._done).to.be.calledOnce;
                expect(diagTool.updateFirmware).to.be.calledWith(
                    'bmc',
                    options.imageName,
                    '0x5f',
                    '/uploads'
                );
                expect(diagTool.bmcReset).to.not.be.called;
            });
        });
    });

});
