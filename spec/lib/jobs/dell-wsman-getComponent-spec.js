// Copyright © 2017 Dell Inc. or its subsidiaries. All Rights Reserved.

'use strict';

describe('Dell Wsman GetComponent Job', function(){
    var WsmanJob;
    var uuid;
    var job;
    var sandbox = sinon.sandbox.create();
    var configuration;
    var WsmanTool;
    var validator;

    before(function(){
        helper.setupInjector([
            helper.require('/spec/mocks/logger.js'),
            helper.require('/lib/jobs/base-job.js'),
            helper.require('/lib/jobs/dell-wsman-base-job.js'),
            helper.require('/lib/jobs/dell-wsman-getComponent.js'),
            helper.require('/lib/utils/job-utils/wsman-tool.js'),
        ]);
        WsmanJob = helper.injector.get('Job.Dell.Wsman.getComponent');
        uuid = helper.injector.get('uuid');
        configuration = helper.injector.get('Services.Configuration');
        WsmanTool = helper.injector.get('JobUtils.WsmanTool');
        validator = helper.injector.get('validator');
    });

    var configFile = {
        "services": {
            "configuration": {
                "getComponents": "",
                "updateComponents": "",
                "configureBios": "/api/1.0/server/configuration/configureBios"
            },
            "shareFolder": {
                "address": "10.62.59.223",
                "shareName": "emc",
                "username": "admin",
                "password": "admin",
                "shareType": 2
            }
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


    it('Should init wsman getComponent job succesfully', function(){
        configuration.get.returns(configFile);
        expect(function(){
            job._initJob();
        }).to.not.throw('Dell SCP  web service is not defined in smiConfig.json.');
    });
    it('Should throw an error: Dell SCP  web service is not defined', function(){
        configuration.get.returns({});
        expect(function(){
            job._initJob();
        }).to.throw('Dell SCP  web service is not defined in smiConfig.json.');
    });

    it('Should return reponse successfully', function(){
        var response = {
            "body": '{"status":"OK"}'
        };
        var result = job._handleSyncResponse(response);
        expect(result).to.equal(response);
    });

    it('Should throw an error: Failed to getComponent from smi service', function(){
        var response = {
            "body": '{"status":"fail"}'
        };
        expect(function(){
            job._handleSyncResponse(response);
        }).to.throw('Failed to getComponent from smi service');
    });

    describe('getComponent function cases', function(){
        it('Should send getComponent request succesfully with volumeId is defined', function(){
            validator.isIP.returns(true);
            job.options.volumeId = "Disk.Virtual.0:RAID.Slot.1-1";
            job.dell = configFile;
            var response = {
                "body": {
                    "response": "Request Submitted"
                }
            };
            WsmanTool.prototype.clientRequest.resolves(response);
            expect(job.getComponent(obms)).to.be.fulfilled;
        });

        it('Should send getComponent request succesfully with drives is defined', function(){
            validator.isIP.returns(true);
            job.options.drives = "Disk.Bay.0:Enclosure.Internal.0-0:RAID.Slot.1-1,"
                +"Disk.Bay.1:Enclosure.Internal.0-0:RAID.Slot.1-1";
            job.dell = configFile;
            var response = {
                "body": {
                    "response": "Request Submitted"
                }
            };
            WsmanTool.prototype.clientRequest.resolves(response);
            expect(job.getComponent(obms)).to.be.fulfilled;
        });

        it('Should throw an error: drives or volumeId isn\'t defined', function(){
            validator.isIP.returns(true);
            job.dell = configFile;
            expect(function(){
                job.getComponent(obms);
            }).to.throw('drives or volumeId isn\'t defined');
        });

        it('Should throw an error: Invalid ServerIP', function(){
            validator.isIP.returns(false);
            expect(function(){
                job.getComponent(obms);
            }).to.throw('Invalid ServerIP');
        });
    });
});
