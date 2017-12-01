// Copyright 2017, Dell EMC, Inc.

'use strict';

describe('Dell Wsman Update SystemComponents Job', function() {
    var WsmanJob;
    var uuid;
    var job;
    var sandbox = sinon.sandbox.create();
    var configuration;
    var BaseJob;
    var WsmanTool;

    before(function(){
        helper.setupInjector([
            helper.require('/spec/mocks/logger.js'),
            helper.require('/lib/jobs/base-job.js'),
            helper.require('/lib/jobs/dell-wsman-base-job.js'),
            helper.require('/lib/jobs/dell-wsman-update-systemcomponents.js'),
            helper.require('/lib/utils/job-utils/wsman-tool.js'),
        ]);
        WsmanJob = helper.injector.get('Job.Dell.Wsman.Update.SystemConfigurationComponents');
        uuid = helper.injector.get('uuid');
        configuration = helper.injector.get('Services.Configuration');
        BaseJob = helper.injector.get('Job.Dell.Wsman.Base');
        WsmanTool = helper.injector.get('JobUtils.WsmanTool');
    });

    var dellConfigs = {
        "services": {
            "configuration": {
                "updateComponents": "/api/1.0/server/configuration/updateComponents"
            },
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
        job = new WsmanJob({
            shareAddress: "192.168.128.3",
            shareName: "testShareName",
            shareUsername: "test",
            sharePassword: "test",
            shareType: 2
        }, {"nodeId": uuid.v4()}, uuid.v4());
        sandbox.stub(configuration, 'get').returns(dellConfigs);
        sandbox.stub(WsmanTool.prototype, 'clientRequest');
        sandbox.stub(job, 'checkOBM').resolves(obm);
    });

    afterEach(function(){
        sandbox.restore();
    });

    it('Should _initJob succesfully', function(){
        WsmanTool.prototype.clientRequest.resolves({
            "body": {
                "status": "OK"
            }
        });
        return job._run().then(function() {
            expect(job.checkOBM).to.be.calledOnce;
        });
    });

    it('Should _initJob throw an error', function(){
        configuration.get.returns({});
        expect(job._run())
            .to.be.rejectedWith(
                'Dell SCP UpdateComponents web service is not defined in smiConfig.json.'
            );
    });

    it('Should _handleSyncRequest succesfully', function(){
        WsmanTool.prototype.clientRequest.resolves({
            "body": {
                "status": "OK"
            }
        });
        return job._run().then(function() {
            expect(WsmanTool.prototype.clientRequest).to.be.calledOnce;
        });
    });
});
