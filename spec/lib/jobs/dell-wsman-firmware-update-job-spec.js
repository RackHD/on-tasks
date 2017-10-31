// Copyright 2017 Dell Inc. or its subsidiaries.  All Rights Reserved.

'use strict';

var uuid = require('node-uuid');
describe('Dell Wsman Get Bios Job', function(){
    var WsmanJob;
    var job;
    var sandbox = sinon.sandbox.create();
    var configuration;
    var BaseJob;
    var WsmanTool;
    var nodeId = uuid.v4();
    var waterline;
    var _;
    var hostIp = "10.10.10.1";
    var obmsMock = {
        service: "dell-wsman-obm-service",
        config: {
            user: "admin",
            password: "abc",
            host: hostIp
        },
        node: nodeId
    };
    var configFile = {
        gateway: "http://1.10.10.10:46010",
        wsmanCallbackUri: "http://172.31.128.1:9988/api/2.0/wsmanCallback/_IDENTIFIER_",
        services: {
            firmware: {
                updater: "/api/1.0/server/firmware/updater",
            },
        },
    };
    before(function(){
        helper.setupInjector([
            helper.require('/spec/mocks/logger.js'),
            helper.require('/lib/jobs/base-job.js'),
            helper.require('/lib/jobs/dell-wsman-base-job.js'),
            helper.require('/lib/jobs/dell-wsman-firmware-update-job.js'),
            helper.require('/lib/utils/job-utils/wsman-tool.js'),
        ]);
        waterline = helper.injector.get('Services.Waterline');
        _ = helper.injector.get("_");
        WsmanJob = helper.injector.get('Job.Dell.Wsman.Firmware.Update');
        configuration = helper.injector.get('Services.Configuration');
        BaseJob = helper.injector.get('Job.Dell.Wsman.Base');
        WsmanTool = helper.injector.get('JobUtils.WsmanTool');
    });

    beforeEach(function(){
        job = new WsmanJob({}, {"nodeId": nodeId}, uuid.v4());
        sandbox.spy(BaseJob.prototype, '_done');
        sandbox.stub(BaseJob.prototype, '_subscribeHttpResponseUuid');
        sandbox.stub(WsmanTool.prototype, 'clientRequest');
        sandbox.stub(BaseJob.prototype, 'checkOBM');
        sandbox.stub(BaseJob.prototype, 'getIpAddress');
        waterline.nodes = {
            findByIdentifier: sandbox.stub()
        };

        waterline.obms = {
            findByNode: sandbox.stub()
        };

        waterline.catalogs = {
            findLatestCatalogOfSource: sandbox.stub(),
            updateByIdentifier: sandbox.stub(),
            create: sandbox.stub()
        };
    });

    afterEach(function(){
        sandbox.restore();
    });

    describe('WSMAN fimrware update job init', function(){
        it('Should init attributes for wsmanBios job successfully', function(){
            BaseJob.prototype.checkOBM.resolves(obmsMock);
            sandbox.stub(configuration,'get').returns(configFile);
            BaseJob.prototype.getIpAddress.resolves(hostIp);
            return job._initJob().then(function(){
                expect(job.targetConfig.serverAddress).to.equal(hostIp);
                expect(job.targetConfig.userName).to.equal('admin');
                expect(job.apiServer).to.equal("http://1.10.10.10:46010");
            });
        });

        it('Should finish with error: web service is not defined', function(){
            BaseJob.prototype.checkOBM.resolves(obmsMock);
            var configFileFake = _.cloneDeep(configFile);
            configFileFake = _.omit(configFileFake, 'gateway');
            sandbox.stub(configuration,'get').returns(configFileFake);
            expect(function(){
                job._initJob();
            })
            .to.throw("Dell firmware update SMI service is not defined in smiConfig.json.");
        });

        it('Should finish with error: updater is not defined', function(){
            BaseJob.prototype.checkOBM.resolves(obmsMock);
            var configFileFake = _.cloneDeep(configFile);
            configFileFake.services.firmware = _.omit(configFileFake.services.firmware, 'updater');
            sandbox.stub(configuration,'get').returns(configFileFake);
            expect(function(){
                job._initJob();
            })
            .to.throw("updater is not defined in smiConfig.json.");
        });

        it('Should finish with error: callbackUri is not defined', function(){
            BaseJob.prototype.checkOBM.resolves(obmsMock);
            var configFileFake = _.cloneDeep(configFile);
            configFileFake = _.omit(configFileFake, 'wsmanCallbackUri');
            sandbox.stub(configuration,'get').returns(configFileFake);
            expect(function(){
                job._initJob();
            })
            .to.throw("wsmanCallbackUri is not defined in smiConfig.json.");
        });

        it('Should finish with error: No target IP address', function(){
            var obmsFake = _.cloneDeep(obmsMock);
            obmsFake.config = _.omit(obmsFake.config, 'host');
            BaseJob.prototype.checkOBM.resolves(obmsFake);
            sandbox.stub(configuration,'get').returns(configFile);
            expect(job._initJob()).to.be.rejectedWith("Dell obm setting is invalid.");
        });
    });

    describe('handle cases for _handleAsyncRequest function', function(){
        beforeEach(function() {
            job.wsman = new WsmanTool(
                configFile.gateway,
                {
                    verifySSL: false,
                    recvTimeoutMs: 60000
                }
            );
            job.firmwareConfigs = configFile.services.firmware;
            job.apiServer = configFile.gateway;
            job.callbackUri = configFile.wsmanCallbackUri;
        });

        it('Should send request to smi service successfully', function(){
            var response = {
                "body": {
                    "response": "Request Submitted!"
                }
            };
            WsmanTool.prototype.clientRequest.resolves(response);
            expect(job._handleAsyncRequest()).to.be.fulfilled;
        });

    });

    describe('Handle callback', function(){
        it('Should handle success reponse:', function(){
            var callBackData = [
                {status: "Success"},
                {status: "Success"},
                {status: "Success"}
            ];
            job.firmwareUpdateCallback(callBackData);
            expect(job._done).to.be.calledOnce;
        });

        it('Should get error: data is Failed', function(){
            var callBackData = [{status: "Failed"}];
            expect(function(){
                job.firmwareUpdateCallback(callBackData);
            })
            .to.throw("Firmware Update Failed for provided server , see logs for details");
        });

        it('Should get error: one of the result data is Failed', function(){
            var callBackData = [{status: "Failed"}, {status: "Success"}];
            expect(function(){
                job.firmwareUpdateCallback(callBackData);
            })
            .to.throw("Firmware Update Failed for provided server , see logs for details");
        });

        it('Should get error: data is empty', function(){
            var callBackData = [];
            expect(function(){
                job.firmwareUpdateCallback(callBackData);
            })
            .to.throw("Firmware Update Failed for provided server , see logs for details");
        });
    });
});
