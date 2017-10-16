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

    var node = {
        "type": "compute",
        "_id": "59db1dc1423ad2cc0650f8bc"
    }
    var obms = {
        "service" : "dell-wsman-obm-service",
        "config" : {
            "user" : "admin",
            "password" : "admin",
            "host" : "192.168.188.13"
        },
        "node" : "59db1dc1423ad2cc0650f8bc"
    };
    before(function(){
        helper.setupInjector([
            helper.require('/spec/mocks/logger.js'),
            helper.require('/lib/jobs/base-job.js'),
            helper.require('/lib/jobs/dell-wsman-bios.js'),
            helper.require('/lib/utils/job-utils/wsman-tool.js'),
        ]);
        waterline = helper.injector.get('Services.Waterline');
        WsmanJob = helper.injector.get('Job.Dell.Wsman.Bios');
        uuid = helper.injector.get('uuid');
        configuration = helper.injector.get('Services.Configuration');
        BaseJob = helper.injector.get('Job.Base');
        WsmanTool = helper.injector.get('JobUtils.WsmanTool');
    });

    beforeEach(function(){
        job = new WsmanJob({}, {"nodeId": uuid.v4()}, uuid.v4());
        sandbox.stub(BaseJob.prototype, '_subscribeHttpResponseUuid');
        sandbox.stub(WsmanTool.prototype, 'clientRequest');
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
        }
    });

    afterEach(function(){
        sandbox.restore();
    });

    describe('wsman bios init job', function(){
        it('Should init attributes for wsmanBios job successfully', function(){
            waterline.nodes.findByIdentifier.resolves(node);
            waterline.obms.findByNode.resolves(obms);
            return job.initJob().then(function(){
                expect(job.target.address).to.equal("192.168.188.13");
                expect(job.inventories.length).to.equal(2);
                expect(job.inventories[0]).to.equal("bios");
            });
        });

        it('Should finish with error of obm setting not found', function(){
            var notCpmouteNode = {
                "type": "notCompute",
                 "_id": "59db1dc1423ad2cc0650f8bc"
            };
            waterline.nodes.findByIdentifier.resolves(notCpmouteNode);

            return job.initJob().then(function(){
                expect(job.nodeType).to.equal("notCompute");
            }).catch(function(error){
                expect(error.name).to.equal("NotFoundError");
                expect(error.message).to.equal("Failed to find Wsman obm settings");

            });
        });

        it('Should finish with error that web service is not defined', function(){
            waterline.nodes.findByIdentifier.resolves(node);
            waterline.obms.findByNode.resolves(obms);

            var configFile = {
                "services":{
                    "inventory":{
                        "bios": false
                    }
                }
            };

            sandbox.stub(configuration,'get').returns(configFile);
            return job.initJob().then(function(){
            }).catch(function(error){
                expect(error.name).to.equal("NotFoundError");
                expect(error.message).to.equal("Dell Configuration (BIOS) web service is not defined in smiConfig.json.");
            });
        });

        it('Should get target Ip Address from DeviceSummary catalog', function(){
            var obms = {
                "service" : "dell-wsman-obm-service",
                "config" : {
                    "user" : "admin",
                    "password" : "admin",
                },
                "node" : "59db1dc1423ad2cc0650f8bc"
            };
            var catalog = {
                "data": {
                    "id": "10.62.59.11"
                }
            };
            waterline.nodes.findByIdentifier.resolves(node);
            waterline.obms.findByNode.resolves(obms);
            waterline.catalogs.findLatestCatalogOfSource.resolves(catalog);

            return job.initJob().then(function(){
                expect(job.target.address).to.equal("10.62.59.11");
                expect(job.inventories.length).to.equal(2);
                expect(job.inventories[0]).to.equal('bios');
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
            waterline.nodes.findByIdentifier.resolves(node);
            waterline.obms.findByNode.resolves(obms);
            waterline.catalogs.findLatestCatalogOfSource.resolves({});
            return job.initJob().then(function(){
                expect(job.target.address).to.equal("undefined");
            }).catch(function(error){
                expect(error.name).to.equal("NotFoundError");
                expect(error.message).to.equal("No target IP address.");
            });
        });

        it('Should get target Ip Address from bmc catalog', function(){
            var obms = {
                "service" : "dell-wsman-obm-service",
                "config" : {
                    "user" : "admin",
                    "password" : "admin",
                },
                "node" : "59db1dc1423ad2cc0650f8bc"
            };
            var catalog = {
                "data": {
                    "Ip Address": "192.168.1.10"
                }
            };
            waterline.nodes.findByIdentifier.resolves(node);
            waterline.obms.findByNode.resolves(obms);
            waterline.catalogs.findLatestCatalogOfSource.withArgs(job.uuid, 'DeviceSummary').resolves({});
            waterline.catalogs.findLatestCatalogOfSource.withArgs(job.uuid, 'bmc').resolves(catalog);
            return job.initJob().then(function(){
                expect(job.target.address).to.equal("192.168.1.10");
            });
        });
    });

    it('Should get bios/boot reponse from smi service successfully', function(){
        waterline.nodes.findByIdentifier.resolves(node);
        waterline.obms.findByNode.resolves(obms);
        var response = {
            "body": {
                "response": "Request Submitted!"
            }
        };

        WsmanTool.prototype.clientRequest.resolves(response);
        return job._run().then(function(){
            expect(WsmanTool.prototype.clientRequest).to.have.been.called;
        });
    });

    it('Should fail to get respone from smi service', function(){
        waterline.nodes.findByIdentifier.resolves(node);
        waterline.obms.findByNode.resolves(obms);
        var response = {
            "body": {
                "response": "Request response"
            }
        };

        WsmanTool.prototype.clientRequest.resolves(response);
        return job._run().then(function(){
            expect(WsmanTool.prototype.clientRequest).to.have.been.called;
        }).catch(function(error){
            expect(error.name).to.equal("BadRequestError");
            expect(error.message).to.equal("bios/boot request failed for node: undefined");
        });
    });

    describe('handle cases of the function handleResponse', function(){
        it('Should get error: data is invalid and scheduling retry', function(){
            var result = {};
            job.inventories = ['bios', 'boot'];
            job.retrys = job.inventories.slice();

            return job.handleResponse(result, "bios").then(function(){
                expect(job.inventories.length).to.equal(3);
                expect(job.inventories[2][0]).to.equal('bios');
            });
        });

        it('Should get error: data is invalid.  No catalog created.', function(){
            var result = {};
            job.inventories = ['bios', 'boot'];
            job.retrys = job.inventories.slice();

            return job.handleResponse(result, "abc").then(function(){
                expect(job.inventories.length).to.equal(2);
            });
        });

        it('Should handlereponse: catalog not found and create', function(){
            var result = {
                "currentBootMode": "BIOS"
            };
            var catalog = {};
            waterline.catalogs.findLatestCatalogOfSource.resolves(catalog);

            return job.handleResponse(result, "bios").then(function(){
                expect(result.currentBootMode).to.equal("BIOS");
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

            return job.handleResponse(result, "bios").then(function(){
                expect(result.currentBootMode).to.equal("BIOS");
            });
        });
    });


});
