// Copyright 2017, Dell EMC, Inc.

'use strict';

describe('Dell Wsman Configure Redfish Alert Job', function() {
    var WsmanJob;
    var uuid;
    var job;
    var sandbox = sinon.sandbox.create();
    var configuration;
    var BaseJob;
    var WsmanTool;
    var waterline = {};

    before(function(){
        helper.setupInjector([
            helper.require('/spec/mocks/logger.js'),
            helper.require('/lib/jobs/base-job.js'),
            helper.require('/lib/jobs/dell-wsman-base-job.js'),
            helper.require('/lib/jobs/dell-wsman-configure-redfish-alert.js'),
            helper.require('/lib/utils/job-utils/wsman-tool.js'),
            helper.di.simpleWrapper(waterline, 'Services.Waterline')
        ]);
        WsmanJob = helper.injector.get('Job.Dell.Wsman.Configure.Redfish.Alert');
        uuid = helper.injector.get('uuid');
        configuration = helper.injector.get('Services.Configuration');
        BaseJob = helper.injector.get('Job.Dell.Wsman.Base');
        WsmanTool = helper.injector.get('JobUtils.WsmanTool');
        waterline.catalogs = {
            findLatestCatalogOfSource: sandbox.stub()
        };
    });

    var dellConfigs = {
        "services": {
            "configuration": {
                "updateComponents": "/api/1.0/server/configuration/updateComponents"
            },
        },
        "shareFolder": {
            "address": "192.168.128.33",
            "username": "admin",
            "password": "admin",
            "shareName": "testShareName",
            "shareType": 2
        },
        "gateway": "http://localhost:46020"
    };

     var obm = {
         "service" : "dell-wsman-obm-service",
         "config" : {
             "user" : "admin",
             "password" : "admin",
             "host" : "192.168.188.13"
         },
         "node" : "59db1dc1423ad2cc0650f8bc"
     };

    beforeEach(function(){
        job = new WsmanJob({}, {"nodeId": uuid.v4()}, uuid.v4());
        sandbox.stub(configuration, 'get').returns(dellConfigs);
        sandbox.stub(WsmanTool.prototype, 'clientRequest');
        sandbox.stub(job, 'checkOBM').resolves(obm);
    });

    afterEach(function(){
        sandbox.restore();
    });

    it('Should _run succesfully', function(){
        WsmanTool.prototype.clientRequest.resolves({
            body: {
                status: 'OK',
                message: 'test message'
            }
        });
        waterline.catalogs.findLatestCatalogOfSource.resolves();
        return job._run().then(function() {
            expect(job.checkOBM).to.be.calledOnce;
            expect(waterline.catalogs.findLatestCatalogOfSource).to.be.calledOnce;
            expect(WsmanTool.prototype.clientRequest).to.be.calledOnce;
        });
    });

    it('Should _initJob throw an error if SCP service is missing', function(){
        configuration.get.returns({});
        return expect(job._run())
            .to.be.rejectedWith(
                'Dell SCP UpdateComponents web service is not defined in smiConfig.json.'
            );
    });

    it('Should _initJob throw an error if shareFolder is missing', function(){
        configuration.get.returns({
            "services": {
                "configuration": {
                    "updateComponents": "/api/1.0/server/configuration/updateComponents"
                },
            },
            "gateway": "http://localhost:46020"
        });
        return expect(job._run())
            .to.be.rejectedWith('The shareFolder is not defined in smiConfig.json.');
    });

    it('Should getServerComponent succesfully', function(){
        waterline.catalogs.findLatestCatalogOfSource.resolves({
            "data": {
                "serverComponents": [
                    {
                        "fqdd": "iDRAC.Embedded.1",
                        "attributes": [
                            {
                                 "name": "IPMILan.1#AlertEnable",
                                 "value" : "Disabled"
                            }
                        ]
                    },
                    {
                        "fqdd": "EventFilters.SystemHealth.1",
                        "attributes": [
                            {
                                 "name": "NIC_1_2#Alert#RedfishEventing",
                                 "value" : "Disabled"
                            }
                        ]
                    },
                    {
                        "fqdd": "EventFilters.Audit.1",
                        "attributes": [
                            {
                                 "name": "FSD_4_3#Alert#RedfishEventing",
                                 "value" : "Disabled"
                            }
                        ]
                    }
                ]
            }
        });

        return job.getServerComponents().then(function(serverComponents) {
            expect(serverComponents).to.be.an.array;
            expect(serverComponents[0]).to.be.an.object;
            expect(serverComponents[0].fqdd).to.equal("iDRAC.Embedded.1");
            expect(serverComponents[0].attributes).to.be.an.array;
            expect(serverComponents[0].attributes[0]).to.be.an.object;
            expect(serverComponents[0].attributes[0].value).to.equal("Enabled");
            expect(serverComponents[1]).to.be.an.object;
            expect(serverComponents[1].fqdd).to.equal("EventFilters.SystemHealth.1");
            expect(serverComponents[1].attributes).to.be.an.array;
            expect(serverComponents[1].attributes[0]).to.be.an.object;
            expect(serverComponents[1].attributes[0].value).to.equal("Enabled");
            expect(serverComponents[2]).to.be.an.object;
            expect(serverComponents[2].fqdd).to.equal("EventFilters.Audit.1");
            expect(serverComponents[2].attributes).to.be.an.array;
            expect(serverComponents[2].attributes[0]).to.be.an.object;
            expect(serverComponents[2].attributes[0].value).to.equal("Disabled");
        });
    });
});
