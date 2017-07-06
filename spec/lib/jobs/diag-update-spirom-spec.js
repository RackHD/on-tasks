// Copyright 2017, Dell EMC, Inc.

'use strict';

var uuid = require('node-uuid');
describe('update spirom by diag', function(){
    var job;
    var taskId = uuid.v4();
    var nodeId = uuid.v4();
    var context = {target: nodeId, nodeIp: "172.31.128.6"};
    var options = {
        localImagePath: "/home/onrack/Oberon_EMC_test.zip",
        imageName: "emc_c_bios_oberon_5042.bin",
        imageMode: "1"
    };
    var lookupServices = {
        nodeIdToIpAddresses: function(){}
    };
    var UpdateSpiRomJob;
    var diagTool = {
        uploadImageFile: sinon.stub(),
        retrySyncDiscovery: sinon.stub(),
        getSlotId: sinon.stub().returns('0_A'),
        updateSpiRom: sinon.stub().resolves(),
        getDeviceApi: sinon.stub().returns("/api/device1"),
        getDevices: sinon.stub().resolves([{device1: '/api/device1'},{device2: '/api/device2'}]),
        getTestList: sinon.stub().resolves({test1: '/api/test1'}),
        warmReset: sinon.stub().resolves()
    };
    function DiagTool() {return diagTool;}

    before(function(){
        helper.setupInjector([
            helper.require('/lib/jobs/base-job.js'),
            helper.require('/lib/jobs/diag-update-spirom.js'),
            helper.require('/lib/utils/job-utils/diag-tool.js'),
            helper.di.simpleWrapper(DiagTool, 'JobUtils.DiagTool'),
            helper.di.simpleWrapper(lookupServices, 'Services.Lookup')
        ]);
        UpdateSpiRomJob = helper.injector.get('Job.Diag.Update.Spirom');
        this.sandbox = sinon.sandbox.create();
    });

    beforeEach('subscribe SEL events job after each', function(){
        this.sandbox.stub(lookupServices, 'nodeIdToIpAddresses').resolves(['1.1.1.1']);
    });

    afterEach('subscribe SEL events job after each', function(){
        this.sandbox.restore();
    });

    it('should run update spirom firmware job', function() {
        job = new UpdateSpiRomJob(options, context, taskId);
        sinon.spy(job, '_done');
        return job._run()
        .then(function(){
            expect(diagTool.retrySyncDiscovery).to.be.calledOnce;
            expect(diagTool.uploadImageFile).to.be.calledOnce;
            expect(diagTool.getDevices).to.be.calledOnce;
            expect(diagTool.getSlotId).to.be.calledOnce;
            expect(diagTool.updateSpiRom).to.be.calledOnce;
            expect(diagTool.getDeviceApi).to.be.calledOnce;
            expect(diagTool.getTestList).to.be.calledOnce;
            expect(diagTool.warmReset).to.be.calledOnce;
            expect(job._done).to.be.calledOnce;
            expect(diagTool.retrySyncDiscovery).to.be.calledWith(5000, 6);
            expect(diagTool.uploadImageFile).to.be.calledWith(options.localImagePath);
            expect(diagTool.getSlotId).to.be.calledWith([
                {device1: '/api/device1'},
                {device2: '/api/device2'}
            ]);
            expect(diagTool.updateSpiRom).to.be.calledWith(
                '0_A',
                options.imageName,
                options.imageMode
            );
            expect(diagTool.getDeviceApi).to.be.calledWith([
                {device1: '/api/device1'},
                {device2: '/api/device2'}
            ]);
            expect(diagTool.getTestList).to.be.calledWith("/api/device1");
            expect(diagTool.warmReset).to.be.calledWith({test1: '/api/test1'});
        });
    });

    it('should run update spirom firmware job with mode name', function() {
        var _options = _.omit(options, 'imageMode');
        _options.imageMode = 'bios';
        _.forEach(diagTool, function(method){
            method.reset();
        });
        job = new UpdateSpiRomJob(_options, context, taskId);
        sinon.spy(job, '_done');
        return job._run()
        .then(function(){
            expect(diagTool.updateSpiRom).to.be.calledWith(
                '0_A',
                options.imageName,
                '1'
            );
        });
    });

    it('should throw error', function() {
        var error = new Error('Test');
        diagTool.retrySyncDiscovery.reset();
        diagTool.retrySyncDiscovery.rejects(error);
        job = new UpdateSpiRomJob(options, context, taskId);
        sinon.stub(job, '_done').resolves();
        return job._run()
        .then(function(){
            expect(job._done).to.be.calledWith(error);
        });
    });

});
