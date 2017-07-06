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
        return diagTool.getDevices()
        .then(function(devices){
            expect(devices).to.deep.equal(dataSamples.getDevices.devices);
        });
    });

    it('should run get test list api', function() {
        var deviceApi = diagTool.getDeviceApi(dataSamples.getDevices.devices);
        nock(server)
            .get('/api/devices/O/0_A/children')
            .reply(200, dataSamples.childrenData)
            .get('/api/devices/O_SP/0_A/tests')
            .reply(200, dataSamples.testList);
        return diagTool.getTestList(deviceApi)
        .then(function(tests){
            expect(tests).to.deep.equal(dataSamples.testList.tests);
        });
    });

    describe('update warm reset tests', function(){
        it('should run warm reset api', function() {
            var testList = dataSamples.testList.tests;
            nock(server)
                .get(testList[2].href + '/run')
                .reply(200, {'test': 'test'});
            return diagTool.warmReset(testList)
            .then(function(body){
                expect(body).to.deep.equal({'test': 'test'});
            });
        });

        it('should report can not get warm reset api', function(done) {
            var testList = _.cloneDeep(dataSamples.testList.tests);
            testList[2].name = 'test';
            nock(server)
                .get(testList[2].href + '/run')
                .reply(200, {'test': 'test'});
            return diagTool.warmReset(testList)
            .then(function(){
                done(new Error('Test should fail'));
            })
            .catch(function(err){
                expect(err.message).to.equal('Can not get warm reset test API');
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
        });

        beforeEach(function(){
            slot = diagTool.getSlotId(dataSamples.getDevices.devices);
        });

        it('should run update SPIROM api with defautl api', function(done) {
            nock(server)
                .filteringRequestBody(function(body){
                    var _body = JSON.parse(body);
                    if (!_.isEqual(payload, _body)) {
                        done(new Error('body is not matched'));
                    }
                })
                .post('/api/devices/SPIROM/0_A_0/tests/update_firmware/sync/run')
                .reply(200, dataSamples.updateSpiRom);
            return diagTool.updateSpiRom(slot, imageName)
            .then(function(body){
                expect(body).to.deep.equal(dataSamples.updateSpiRom);
                done();
            });
        });

        it('should run update SPIROM api', function(done) {
            nock(server)
                .filteringRequestBody(function(body){
                    var _body = JSON.parse(body);
                    if (!_.isEqual(payload, _body)) {
                        done(new Error('body is not matched'));
                    }
                })
                .post('/api/devices/SPIROM/0_A_0/tests/update_firmware/sync/run')
                .reply(200, dataSamples.updateSpiRom);
            return diagTool.updateSpiRom(slot, imageName, mode, imagePath)
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

    describe('upload image api tests', function(){
        it('should run upload image api', function() {
            var file = __dirname + '/samplefiles/diag-tool.txt';
            nock(server)
                .post('/api/upload/folder')
                .reply(200, {'test': 'test'});
            return diagTool.uploadImageFile(file)
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
                    "ENOENT: no such file or directory, open " +
                    "'/home/onrack/src/on-tasks/spec/lib/utils/job-utils/samplefiles/diag-tool.tx'"
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

        afterEach('subscribe SEL events job after each', function(){
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

});
