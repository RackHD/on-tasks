// Copyright 2017, DELL EMC, Inc.

'use strict';

describe('Dell Wsman Set Bios Job', function(){
    var WsmanJob;
    var uuid;
    var job;
    var sandbox = sinon.sandbox.create();
    var configuration;
    var BaseJob;
    var WsmanTool;
    var validator;

    before(function(){
        helper.setupInjector([
            helper.require('/spec/mocks/logger.js'),
            helper.require('/lib/jobs/base-job.js'),
            helper.require('/lib/jobs/dell-wsman-base-job.js'),
            helper.require('/lib/jobs/dell-wsman-configure-bios.js'),
            helper.require('/lib/utils/job-utils/wsman-tool.js'),
        ]);
        WsmanJob = helper.injector.get('Job.Dell.Wsman.ConfigureBios');
        uuid = helper.injector.get('uuid');
        configuration = helper.injector.get('Services.Configuration');
        BaseJob = helper.injector.get('Job.Dell.Wsman.Base');
        WsmanTool = helper.injector.get('JobUtils.WsmanTool');
        validator = helper.injector.get('validator');
    });

    var configFile = {
        "services": {
            "inventory": {
                "bios": "true"
            },
            "configuration": {
                "getComponents": "",
                "updateComponents": "",
                "configureBios": "/api/1.0/server/configuration/configureBios"
            },
        },
        "gateway": "http://localhost:46011"
    };

     var obms = {
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
        sandbox.stub(configuration, 'get');
        sandbox.stub(validator, 'isIP');
        sandbox.stub(WsmanTool.prototype, 'clientRequest');

    });
    afterEach(function(){
        sandbox.restore();
    });

    it('Should init wsman job succesfully', function(){
        configuration.get.returns(configFile);
        expect(function(){
            job._initJob()
        }).to.not.throw('Dell SCP  web service is not defined in smiConfig.json.');
    });
    it('Should throw an error: Dell SCP  web service is not defined', function(){
        configuration.get.returns({});
        expect(function(){
            job._initJob()
        }).to.throw('Dell SCP  web service is not defined in smiConfig.json.');
    });

    it('Should return reponse successfully', function(){
        var response = {
            "body": {
                "status": "OK",
                "configureBiosResult": "configureBiosResult"
            }
        };

        var result = job._handleSyncResponse(response);
        expect(result).to.equal(response);
    });

    it('Should throw an error: Failed to configure Bios', function(){
        var response = {
            "body": {
                "status": "fail",
                "configureBiosResult": ""
            }
        };
        expect(function(){
            job._handleSyncResponse(response)
        }).to.throw('Failed to configure Bios');
    });

    it('Should send configureBios request succesfully', function(){
        validator.isIP.returns(true);
        job.dell = configFile;
        var response = {
            "body": {
                "response": "Request Submitted"
            }
        };
        WsmanTool.prototype.clientRequest.resolves(response);
        return job.configureBios(obms).then(function(){
            expect(job.configureBios(obms)).to.be.fulfilled;
        });
    });

    it('Should throw an error: Invalid ServerIP', function(){
        validator.isIP.returns(false);
        expect(function(){
            job.configureBios(obms)
        }).to.throw('Invalid ServerIP');
    });

});
