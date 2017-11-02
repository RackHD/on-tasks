// Copyright 2017, DELL EMC, Inc.

'use strict';

describe('Dell Wsman Get Bios Job', function(){
    var waterline;
    var WsmanJob;
    var uuid;
    var job;
    var sandbox = sinon.sandbox.create();
    var configuration;
    var BaseJob;
    var WsmanTool;
    var obms = {
        "service" : "dell-wsman-obm-service",
        "config" : {
            "user" : "admin",
            "password" : "admin",
            "host" : "192.168.188.13"
        },
        "node" : "59db1dc1423ad2cc0650f8bc"
    };

    var configFile = {
        "services": {
            "inventory": {
                "bios": "true"
            }
        },
        "gateway": "http://localhost:46011",

    };
    before(function(){
        helper.setupInjector([
            helper.require('/spec/mocks/logger.js'),
            helper.require('/lib/jobs/base-job.js'),
            helper.require('/lib/jobs/dell-wsman-base-job.js'),
            helper.require('/lib/jobs/dell-wsman-bios.js'),
            helper.require('/lib/utils/job-utils/wsman-tool.js'),
        ]);
        waterline = helper.injector.get('Services.Waterline');
        WsmanJob = helper.injector.get('Job.Dell.Wsman.Bios');
        uuid = helper.injector.get('uuid');
        configuration = helper.injector.get('Services.Configuration');
        BaseJob = helper.injector.get('Job.Dell.Wsman.Base');
        WsmanTool = helper.injector.get('JobUtils.WsmanTool');
    });

    beforeEach(function(){
        job = new WsmanJob({}, {"nodeId": uuid.v4()}, uuid.v4());
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

    describe('wsman bios init job', function(){
        it('Should init attributes for wsmanBios job successfully', function(){
            BaseJob.prototype.checkOBM.resolves(obms);
            sandbox.stub(configuration,'get').returns(configFile);
            BaseJob.prototype.getIpAddress.resolves("192.168.188.13");

            return job._initJob().then(function(){
                expect(job.target.address).to.equal("192.168.188.13");
                expect(job.inventories.length).to.equal(2);
                expect(job.inventories[0]).to.equal("bios");
            });
        });

        it('Should finish with error that web service is not defined', function(){
            BaseJob.prototype.checkOBM.resolves(obms);
            var configFile = {
                "services":{
                    "inventory":{
                        "bios": false
                    }
                }
            };
            sandbox.stub(configuration,'get').returns(configFile);
            return job._initJob().then(function(){
                expect(job.target.ipAddr).to.equal(undefined);
            }).catch(function(error){
                expect(error.name).to.equal("NotFoundError");
                expect(error.message).to.equal("Dell Configuration (BIOS) web service is not defined in smiConfig.json.");
            });
        });

        it('Should finish with an error: No target IP address', function(){
            var obms = {
                "service" : "dell-wsman-obm-service",
                "config" : {
                    "user" : "admin",
                    "password" : "admin",
                },
                "node" : "59db1dc1423ad2cc0650f8bc"
            };
            BaseJob.prototype.checkOBM.resolves(obms);
            sandbox.stub(configuration,'get').returns(configFile);
            BaseJob.prototype.getIpAddress.resolves(undefined);

            return job._initJob().then(function(){
                expect(job.inventories).to.equal("undefined");
            }).catch(function(error){
                expect(error.name).to.equal("NotFoundError");
                expect(error.message).to.equal("No target IP address.");
            });
        });

    });

    describe('handle cases for _handleAsyncRequest function', function(){
        it('Should send request to smi service successfully', function(){
            job.wsman = new WsmanTool('http://127.0.0.1');
            job.inventories = ['bios', 'boot'];
            job.dellConfigs = {
                "wsmanCallbackUri": "http://172.31.128.1:9988/api/2.0/wsmanCallback/_IDENTIFIER_",
                "services": {
                    "inventory": {
                        "serverCallback": "/api/1.0/server/inventory/callback"
                    }
                }
            };
            var response = {
                "body": {
                    "response": "Request Submitted!"
                }
            };
            WsmanTool.prototype.clientRequest.resolves(response);
            expect(job._handleAsyncRequest()).to.be.fulfilled;
        });

        it('Should fail to get respone from smi service', function(){
            job.wsman = new WsmanTool('http://127.0.0.1');
            job.inventories = ['bios', 'boot'];
            job.dellConfigs = {
                "wsmanCallbackUri": "http://172.31.128.1:9988/api/2.0/wsmanCallback/_IDENTIFIER_",
                "services": {
                    "inventory": {
                        "serverCallback": "/api/1.0/server/inventory/callback"
                    }
                }
            };
            var response = {
                "body": {
                    "response": "Request response"
                }
            };
            WsmanTool.prototype.clientRequest.resolves(response);
            expect(job._handleAsyncRequest())
                .to.be.rejectedWith('bios/boot request failed for node: undefined');
        });
    });

    describe('handle cases of the function handleAsyncResponse', function(){
        it('Should get error: data is invalid and scheduling retry', function(){
            var result = {};
            job.inventories = ['bios', 'boot'];
            job.retrys = job.inventories.slice();

            return job.handleAsyncResponse(result, "bios").then(function(){
                expect(job.inventories.length).to.equal(3);
                expect(job.inventories[2][0]).to.equal('bios');
            });
        });

        it('Should get error: data is invalid.  No catalog created.', function(){
            var result = {};
            job.inventories = ['bios', 'boot'];
            job.retrys = job.inventories.slice();

            return job.handleAsyncResponse(result, "abc").then(function(){
                expect(job.inventories.length).to.equal(2);
            });
        });

        it('Should handlereponse: catalog not found and create', function(){
            var result = {
                "currentBootMode": "BIOS"
            };
            var catalog = {};
            waterline.catalogs.findLatestCatalogOfSource.resolves(catalog);

            return job.handleAsyncResponse(result, "bios").then(function(){
                expect(waterline.catalogs.create).to.be.called;
            });
        });

        it('Should handlereponse: catalog found and update', function(){
            var result = {
                "currentBootMode": "BIOS"
            };
            var catalog = {
                "id": uuid.v4()
            };
            waterline.catalogs.findLatestCatalogOfSource.resolves(catalog);

            return job.handleAsyncResponse(result, "bios").then(function(){
                expect(waterline.catalogs.updateByIdentifier).to.be.called;
            });
        });
    });


});
