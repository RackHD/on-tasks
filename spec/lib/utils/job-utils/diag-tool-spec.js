// Copyright 2017, Dell EMC, Inc.

'use strict';

var uuid = require('node-uuid');
var nock = require('nock');
var _ = require('lodash');

describe('diag tools', function(){
    var diagTool;
    var DiagTool;
    var nodeId =  uuid.v4();
    var server = 'http://10.1.1.1:8080';
    var stdoutMocks = require('./stdout-helper');
    var dataSamples = JSON.parse(stdoutMocks.diagApiData);
    before(function(){
        helper.setupInjector([
            helper.require('/lib/utils/job-utils/diag-tool.js')
        ]);
        DiagTool = helper.injector.get('JobUtils.DiagTool');
        diagTool = new DiagTool({host: '10.1.1.1'}, nodeId);
        this.sandbox = sinon.sandbox.create();
    });

    afterEach('subscribe SEL events job after each', function(){
        nock.cleanAll();
        diagTool.platformDevice = {};
        diagTool.spDevice = {};
        diagTool.spChildren = {};
        this.sandbox.restore();
    });

    describe('upload image api tests', function(){
        it('should run upload image api', function() {
            var file = __dirname + '/samplefiles/diag-tool.txt';
            var uploadApi = '/api/upload';
            nock(server)
                .post(uploadApi)
                .reply(200, {'test': 'test'});
            return diagTool.uploadImageFile(file, uploadApi)
            .then(function(body){
                expect(JSON.parse(body)).to.deep.equal({'test': 'test'});
            });
        });

        it('should report image does not exist', function(done) {
            var file = __dirname + '/samplefiles/diag-tool.tx';
            return diagTool.uploadImageFile(file)
            .then(function(){
                done(new Error('Test should fail'));
            })
            .catch(function(err){
                expect(err.message).to.equal(
                    "ENOENT: no such file or directory, open '%s'".format(file)
                );
                done();
            });
        });
    });

    it('should run sync discovery api', function() {
        var discoveryApi = '/api/system/tests/discovery/sync/run';
        nock(server)
            .get(discoveryApi)
            .reply(200, dataSamples.runSyncDiscovery);
        return diagTool.runSyncDiscovery()
        .then(function(body){
            expect(body).to.deep.equal(dataSamples.runSyncDiscovery);
        });
    });

    describe('retry sync discovery api tests', function(){
        var runDiscoveryStub;
        var retryDiscoverySpy;

        before(function(){
            runDiscoveryStub = sinon.stub(diagTool, 'runSyncDiscovery');
            retryDiscoverySpy = sinon.spy(diagTool, 'retrySyncDiscovery');
        });

        afterEach('retry sync discovery api tests', function(){
            runDiscoveryStub.reset();
            retryDiscoverySpy.reset();
        });

        it('should retry sync discovery api', function(){
            runDiscoveryStub.onCall(0).rejects('Test');
            runDiscoveryStub.onCall(1).rejects({statusCode: 500});
            runDiscoveryStub.onCall(2).resolves({statusCode: 200});
            return diagTool.retrySyncDiscovery(1, 6)
            .then(function(){
                expect(diagTool.runSyncDiscovery).to.be.calledThrice;
                expect(diagTool.retrySyncDiscovery).to.be.calledWith(1, 6);
                expect(diagTool.retrySyncDiscovery).to.be.calledWith(2, 5);
                expect(diagTool.retrySyncDiscovery).to.be.calledWith(4, 4);
            });
        });

        it('should report retry sync discovery api timeout', function(done){
            runDiscoveryStub.onCall(0).rejects('Test');
            runDiscoveryStub.onCall(1).rejects({statusCode: 500});
            runDiscoveryStub.onCall(2).rejects({statusCode: 500});
            return diagTool.retrySyncDiscovery(1, 2)
            .then(function(){
                done(new Error('Test should fail'));
            })
            .catch(function(err){
                expect(diagTool.runSyncDiscovery).to.be.calledThrice;
                expect(diagTool.retrySyncDiscovery).to.be.calledWith(1, 2);
                expect(diagTool.retrySyncDiscovery).to.be.calledWith(2, 1);
                expect(err.message).to.be.equal('Failed to connect to diag on node, timeout');
                done();
            });
        });

        it('should report retry sync discovery api timeout', function(done){
            runDiscoveryStub.onCall(0).rejects({statusCode: 400});
            return diagTool.retrySyncDiscovery(1, 2)
            .then(function(){
                done(new Error('Test should fail'));
            })
            .catch(function(err){
                expect(diagTool.runSyncDiscovery).to.be.calledOnce;
                expect(diagTool.retrySyncDiscovery).to.be.calledWith(1, 2);
                expect(err).to.be.deep.equal({statusCode: 400});
                done();
            });
        });
    });

    describe('update firmware tests', function(){
        var payload;
        var imageName;
        var imagePath;
        var mode;
        before(function(){
            imageName = 'test0';
            imagePath = '/uploads';
            mode = "1";
            payload = {
                "test_args": [
                    {
                      "value": imageName,
                      "base": "string",
                      "name": "image_name"
                    },
                    {
                      "value": imagePath,
                      "base": "string",
                      "name": "image_path"
                    }
                ]
            };
        });

        it('should run update bios api with default image path', function() {
            var _payload = _.cloneDeep(payload);
            _payload.test_args[2] = {"value": '1', "base": "dec", "name": "mode"};
            nock(server)
                .post('/api/devices/SPIROM/0_A_0/tests/update_firmware/sync/run', _payload)
                .reply(200, dataSamples.updateSpiRom);

            this.sandbox.stub(diagTool, 'getItemByName').resolves({slot: '0_A_0'});
            return diagTool.updateFirmware('bios', imageName, '1')
            .then(function(body){
                expect(body).to.deep.equal(dataSamples.updateSpiRom);
            });
        });

        it('should run update bmc api', function(done) {
            var _imagePath = '/tests';
            var _payload = _.cloneDeep(payload);
            _payload.test_args[1].value = _imagePath;
            _payload.test_args[2] = {"value": '0x140', "base": "hex", "name": "image_id"};
            nock(server)
                .post('/api/devices/BMC_EMC_OEM/0_A/tests/update_firmware/sync/run', _payload)
                .reply(200, dataSamples.updateBmc);
            this.sandbox.stub(diagTool, 'getItemByName').resolves({slot: '0_A'});
            return diagTool.updateFirmware('bmc', imageName, '0x140', _imagePath)
            .then(function(body){
                expect(body).to.deep.equal(dataSamples.updateBmc);
                done();
            });
        });

        it('should throw firmware is not supported error', function(done) {
            diagTool.updateFirmware('test', imageName, mode, imagePath)
            .then(function(){
                done(new Error('Test should fail'));
            })
            .catch(function(err){
                expect(err.message).to.equal('Firmware test update is not supported');
                done();
            });
        });

    });

    it('should run warm reset api', function() {
        diagTool.spDevice = dataSamples.spDevices.devices[0];
        nock(server)
            .get('/api/devices/%s/%s/tests/warm_reset/run'.format(
                diagTool.spDevice.name, diagTool.spDevice.slot
            ))
            .reply(200, 'tests');
        return diagTool.warmReset(false)
        .then(function(body){
            expect(body).to.equal('tests');
        });
    });

    it('should run get all devices api', function() {
        nock(server)
            .get('/api/devices')
            .reply(200, dataSamples.platformDevices)
            .get('/api/devices/Platform_O/0_A/children')
            .reply(200, dataSamples.spDevices)
            .get('/api/devices/Platform_O_SP/0_A/children')
            .reply(200, dataSamples.spChildren);
        return diagTool.getAllDevices()
        .then(function(){
            expect(diagTool.platformDevice).to.deep.equal(dataSamples.platformDevices.devices[0]);
            expect(diagTool.spDevice).to.deep.equal(dataSamples.spDevices.devices[0]);
            expect(diagTool.spChildren).to.deep.equal(dataSamples.spChildren.devices);
        });
    });

    it('should get item by name', function() {
        expect(diagTool.getItemByName('BMC_Plugin', dataSamples.spChildren.devices))
            .to.deep.equal(dataSamples.spChildren.devices[1]);
        expect(function(){
            diagTool.getItemByName('BMC_EMC_OEM', dataSamples.spChildren.devices);
        }).to.throw(Error, "No name %s found in given list".format('BMC_EMC_OEM'));
    });

    it('should run get device info API', function() {
        nock(server)
            .get('/api/devices/Platform_O/0_A/tests')
            .reply(200, dataSamples.testList);
        return diagTool.getDeviceInfo('/api/devices/Platform_O/0_A', 'tests')
        .then(function(body){
            expect(body).to.deep.equal(dataSamples.testList.tests);
        });
    });

});
