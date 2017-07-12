// Copyright 2017, Dell EMC, Inc.

'use strict';

var uuid = require('node-uuid');
var nock = require('nock');
var _ = require('lodash');

describe('update spirom by diag', function(){
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
    });

    afterEach('subscribe SEL events job after each', function(){
        nock.cleanAll();
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

    it('should run get devices api', function() {
        nock(server)
            .get('/api/devices')
            .reply(200, dataSamples.getDevices);
        return diagTool.getDeviceInfo()
        .then(function(device){
            expect(device).to.deep.equal(dataSamples.getDevices.devices[0]);
        });
    });

    it('should run get test list api', function() {
        var deviceApi = dataSamples.getDevices.devices[0].href;
        nock(server)
            .get('/api/devices/Platform_O/0_A/children')
            .reply(200, dataSamples.childrenData)
            .get('/api/devices/Platform_O_SP/0_A/tests')
            .reply(200, dataSamples.testList);
        return diagTool.getSpTestList(deviceApi)
        .then(function(tests){
            expect(tests).to.deep.equal(dataSamples.testList.tests);
        });
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

    describe('update SPIROM tests', function(){
        var payload;
        var imageName;
        var imagePath;
        var mode;
        var slot;
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
                    },
                    {
                      "value": mode,
                      "base": "dec",
                      "name": "mode"
                    }
                ]
            };
            slot = dataSamples.getDevices.devices[0].slot;
        });

        it('should run update SPIROM api with default image path', function(done) {
            nock(server)
                .filteringRequestBody(function(body){
                    var _body = JSON.parse(body);
                    if (!_.isEqual(payload, _body)) {
                        done(new Error('body is not matched'));
                    }
                })
                .post('/api/devices/SPIROM/0_A_0/tests/update_firmware/sync/run')
                .reply(200, dataSamples.updateSpiRom);
            return diagTool.updateSpiRom(slot, imageName, '1')
            .then(function(body){
                expect(body).to.deep.equal(dataSamples.updateSpiRom);
                done();
            });
        });

        it('should run update SPIROM api', function(done) {
            var _imagePath = '/pp';
            var _payload = _.cloneDeep(payload);
            _payload.test_args[1].value = _imagePath;
            nock(server)
                .filteringRequestBody(function(body){
                    var _body = JSON.parse(body);
                    if (!_.isEqual(_payload, _body)) {
                        done(new Error('body is not matched'));
                    }
                })
                .post('/api/devices/SPIROM/0_A_0/tests/update_firmware/sync/run')
                .reply(200, dataSamples.updateSpiRom);
            return diagTool.updateSpiRom(slot, imageName, mode, _imagePath)
            .then(function(body){
                expect(body).to.deep.equal(dataSamples.updateSpiRom);
                done();
            });
        });

        it('should report reset flag is not expected', function(done) {
            var resetTestData = _.cloneDeep(dataSamples.updateSpiRom);
            resetTestData.result[2].atomic_test_data.secure_firmware_update = 'Issue warm reset';
            nock(server)
                .filteringRequestBody(function(body){
                    var _body = JSON.parse(body);
                    if (!_.isEqual(payload, _body)) {
                        done(new Error('body is not matched'));
                    }
                })
                .post('/api/devices/SPIROM/0_A_0/tests/update_firmware/sync/run')
                .reply(200, resetTestData);
            return diagTool.updateSpiRom(slot, imageName, mode, imagePath)
            .then(function(){
                done(new Error('Test should fail'));
            })
            .catch(function(err){
                expect(err.message).to.equal('Failed to get reset flags from diag');
                done();
            });
        });

    });

    describe('execute API tests', function(){
        var testList;
        var warmResetApi;
        before(function(){
            testList = dataSamples.testList.tests;
            warmResetApi = diagTool.getTestApiByName('warm_reset', testList);
        });
        it('should run async warm reset api', function() {
            nock(server)
                .get(testList[2].href + '/run')
                .reply(200, {'test': 'test'});
            return diagTool.executeSpTest(warmResetApi)
            .then(function(body){
                expect(body).to.deep.equal({'test': 'test'});
            });
        });
        
        it('should run sync warm reset api', function() {
            nock(server)
                .get(testList[2].href + '/sync/run')
                .reply(200, {'test': 'test'});
            return diagTool.executeSpTest(warmResetApi, true)
            .then(function(body){
                expect(body).to.deep.equal({'test': 'test'});
            });
        });
        
        it('should run given warm reset api', function() {
            nock(server)
                .get(testList[2].href + '/anything/run')
                .reply(200, {'test': 'test'});
            return diagTool.executeSpTest(warmResetApi + '/anything/run', true)
            .then(function(body){
                expect(body).to.deep.equal({'test': 'test'});
            });
        });
    });

});
