// Copyright 2017, DELL EMC, Inc.

'use strict';

describe('Dell Wsman Get Component Config Catalog Job', function(){
    var waterline;
    var WsmanJob;
    var uuid;
    var job;
    var sandbox = sinon.sandbox.create();
    var configuration;
    var WsmanTool;
    var obms = {
        "service" : "dell-wsman-obm-service",
        "config" : {
            "user" : "abc",
            "password" : "123",
            "host" : "1.1.1.1"
        },
        "node" : "59db1dc1423ad2cc0650f8bc"
    };

    var configFile = {
        "services": {
            "configuration": {
                "getComponents": "/api/1.0/server/configuration/getComponents",
            }
        },
        "gateway": "http://localhost:46011",
        "shareFolder": {
            "address": "20.20.20.20",
            "shareName": "test",
            "username": "adc",
            "password": "123",
            "shareType": 0
        },
    };
    var fullResponse = {
        "body": {
            "status": "OK",
            "message": "Request Success",
            "serverComponents": [
                {
                    "fqdd": "LifecycleController.Embedded.1",
                    "attributes": []
                }
            ]
        }
    };

    before(function(){
        helper.setupInjector([
            helper.require('/spec/mocks/logger.js'),
            helper.require('/lib/jobs/base-job.js'),
            helper.require('/lib/jobs/dell-wsman-base-job.js'),
            helper.require('/lib/jobs/dell-wsman-get-systemcomponents.js'),
            helper.require('/lib/utils/job-utils/wsman-tool.js')
        ]);
        waterline = helper.injector.get('Services.Waterline');
        WsmanJob = helper.injector.get('Job.Dell.Wsman.Get.SystemConfigurationComponents');
        uuid = helper.injector.get('uuid');
        configuration = helper.injector.get('Services.Configuration');
        WsmanTool = helper.injector.get('JobUtils.WsmanTool');
    });

    beforeEach(function(){
        job = new WsmanJob({}, {"nodeId": uuid.v4()}, uuid.v4());
        sandbox.stub(WsmanTool.prototype, 'clientRequest');
        sandbox.stub(job, 'checkOBM');
        sandbox.stub(job, 'getIpAddress');
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

    describe('wsman bios init job', function() {
        it('Should init attributes for wsmanBios job successfully', function() {
            sandbox.stub(configuration,'get').returns(configFile);
            job._initJob();
            return expect(job.options.shareAddress).to.equal("20.20.20.20");
        });

        it('Should finish with error that web service is not defined', function(){
            job.checkOBM.resolves(obms);
            var emptyconfigFile = {
                services:{
                    configuration:""
                }
            };
            sandbox.stub(configuration,'get').returns(emptyconfigFile);
            return expect(function(){
                job._initJob();
            }).to.throw("Dell SCP GetConfiguration web service is not defined in smiConfig.json");
        });

        it('Should throw an error: The shareFolder is not defined in smiConifg', function(){
            var fakeConfigFile={
                "services": {
                    "configuration": {
                        "getComponents": "",
                        "updateComponents": "",
                    }
                },
                "gateway":"10.10.10.10",
            };
            sandbox.stub(configuration,'get').returns(fakeConfigFile);
            return expect(function(){
                job._initJob();
            }).to.throw('The shareFolder is neither defined in smiConfig.json nor input by user');
        });
    });

    describe('handle cases for _handlesyncRequest function', function() {
        it('Should return reponse successfully with iDARC parameters in options', function() {
            job.options.serverAddress = "2.2.2.2";
            job.options.serverUsername = "abc";
            job.options.serverPassword = "123";
            job.checkOBM.resolves(obms);
            sandbox.stub(configuration,'get').returns(configFile);
            sandbox.stub(job, 'getComponents');
            return job._run().then(function(){
                expect(job.getComponents).to.be.called;
            });
        });

        it('Should return reponse successfully with empty iDRAC parameter', function() {
            job.options.serverAddress = null;
            job.options.serverUsername = null;
            job.options.serverPassword = null;
            job.checkOBM.resolves("");
            sandbox.stub(configuration, 'get').returns(configFile);
            sandbox.stub(job, 'getComponents');
            return job._run().then(function(){
                expect(job.getComponents).to.be.called;
            });
        });
    });

    describe('handle cases for getComponents function', function(){
        it('Should throw error: response has no expected field', function(){
            job.options.serverIP = "2.2.2.2";
            job.options.serverUsername = "abc";
            job.options.serverPassword = "123";
            job.dell = configFile;
            var response = {
                "body": '{"status":"OK"}'
            };
            WsmanTool.prototype.clientRequest.resolves(response);
            return expect(job.getComponents(obms)).to.be.rejectedWith('Failed to Get the Requested Components');
        });

        it('Should work with obms when serverIP in task option is null', function(){
            job.options.serverIP = null;
            job.options.serverUsername = null;
            job.options.serverPassword = null;
            job.dell = configFile;
            WsmanTool.prototype.clientRequest.resolves(fullResponse);
            return expect(job.getComponents(obms)).to.be.fullfilled;
        });

    });

    describe('handle cases of the function handlesyncResponse', function(){
        it('Should create db when result is valid and there is no record yet', function(){
            var result = {
                data: fullResponse.boby,
                source: "idrac-wsman",
                store: true,
            };
            var catalog = {};
            waterline.catalogs.findLatestCatalogOfSource.resolves(catalog);
            return job._handleSyncResponse(result)
            .then(function(){
                expect(waterline.catalogs.create).to.be.calledOnce;
                expect(waterline.catalogs.updateByIdentifier).not.to.be.called;
            });
        });

        it('Should update db when result is valid and there is record in db', function(){
            var result = {
                data: fullResponse.boby,
                source: "idrac-wsman",
                store: true,
            };
            var catalog = {
                "id": "94152da9-daf2-42ae-98c1-f0cb430b2e77",
                "source": "idrac-racadm-configure",
                "data": {
                      "systemInfo": {
                              "Model": "PowerEdge R730",
                              "ServiceTag": "xxxxxx",
                              "TimeStamp": "2017"}
                }
            };
            waterline.catalogs.findLatestCatalogOfSource.resolves(catalog);
            return job._handleSyncResponse(result)
            .then(function(){
                expect(waterline.catalogs.create).not.to.be.called;
                expect(waterline.catalogs.updateByIdentifier).to.be.calledOnce;
            });
        });

        it('Should get error: get response invalid data, no catalog created.', function(){
            var result = null;
            return  job._handleSyncResponse(result)
            .then(function(){
                expect(waterline.catalogs.create).not.to.be.called;
                expect(waterline.catalogs.updateByIdentifier).not.to.be.called;
            });
        });
    });
});
