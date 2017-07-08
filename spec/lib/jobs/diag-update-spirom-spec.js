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
    var sandbox = sinon.sandbox.create();
    var deviceInfo = {
        slot: '0_A',
        href: '/api/device1'
    };
    var diagTool = {
        uploadImageFile: sandbox.stub(),
        retrySyncDiscovery: sandbox.stub(),
        updateSpiRom: sandbox.stub().resolves(),
        getDeviceInfo: sandbox.stub().resolves(deviceInfo),
        getSpTestList: sandbox.stub().resolves([{test1: '/api/test1'}]),
        getTestApiByName: sandbox.stub().returns('/api/test2'),
        exeSpTest: sandbox.stub().resolves()
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
        this.sandbox = sandbox;
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
            expect(diagTool.getDeviceInfo).to.be.calledOnce;
            expect(diagTool.updateSpiRom).to.be.calledOnce;
            expect(diagTool.getSpTestList).to.be.calledOnce;
            expect(diagTool.getTestApiByName).to.be.calledOnce;
            expect(diagTool.exeSpTest).to.be.calledOnce;
            expect(job._done).to.be.calledOnce;
            expect(diagTool.retrySyncDiscovery).to.be.calledWith(5000, 6);
            expect(diagTool.uploadImageFile).to.be.calledWith(options.localImagePath);
            expect(diagTool.updateSpiRom).to.be.calledWith(
                '0_A',
                options.imageName,
                options.imageMode
            );
            expect(diagTool.getSpTestList).to.be.calledWith("/api/device1");
            expect(diagTool.getTestApiByName).to.be.calledWith(
                'warm_reset',
                [{test1: '/api/test1'}]
            );
            expect(diagTool.exeSpTest).to.be.calledWith('/api/test2');
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

    it('should throw invalid IP error', function() {
        var _context = _.cloneDeep(context);
        _context.nodeIp = '10.1.1.';
        job = new UpdateSpiRomJob(options, _context, taskId);
        this.sandbox.stub(job, '_done').resolves();
        return job._run()
        .then(function(){
            expect(job._done).to.be.calledOnce;
            expect(job._done.args[0][0].message).to.equal(
                'Violated isIP constraint (10.1.1.,4).'
            );
        });
    });

    it('should throw error', function() {
        var error = new Error('Test');
        diagTool.retrySyncDiscovery.rejects(error);
        job = new UpdateSpiRomJob(options, context, taskId);
        this.sandbox.stub(job, '_done').resolves();
        return job._run()
        .then(function(){
            expect(job._done).to.be.calledOnce;
            expect(job._done.args[0][0]).to.deep.equal(error);
        });
    });

});
