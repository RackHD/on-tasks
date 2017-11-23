// Copyright © 2017 Dell Inc. or its subsidiaries. All Rights Reserved.

'use strict';

describe('Dell Wsman RAID Job', function(){
    var WsmanJob;
    var uuid;
    var job;
    var sandbox = sinon.sandbox.create();
    var configuration;
    var WsmanTool;
    var validator;
    var Smb2Client;
    var NfsClient;

    before(function(){
        helper.setupInjector([
            helper.require('/spec/mocks/logger.js'),
            helper.require('/lib/jobs/base-job.js'),
            helper.require('/lib/jobs/dell-wsman-base-job.js'),
            helper.require('/lib/jobs/dell-wsman-RAID.js'),
            helper.require('/lib/utils/job-utils/wsman-tool.js'),
            helper.require('/lib/utils/job-utils/smb2-client.js'),
            helper.require('/lib/utils/job-utils/nfs-client.js')
        ]);
        WsmanJob = helper.injector.get('Job.Dell.Wsman.RAID');
        uuid = helper.injector.get('uuid');
        configuration = helper.injector.get('Services.Configuration');
        WsmanTool = helper.injector.get('JobUtils.WsmanTool');
        validator = helper.injector.get('validator');
        Smb2Client = helper.injector.get('JobUtils.Smb2Client');
        NfsClient = helper.injector.get('JobUtils.NfsClient');
    });

    var configFile = {
        "services": {
            "configuration": {
                "getComponents": "",
                "updateComponents": "",
                "configureBios": "/api/1.0/server/configuration/configureBios"
            },
        },
        "shareFolder": {
            "shareAddress": "192.128.10.23",
            "shareName": "RAID",
            "sharePassword": "123456",
            "shareType": "2",
            "shareUsername": "admin"
        },
        "gateway": "http://localhost:46011"
    };

    var obms = {
        "service" : "dell-wsman-obm-service",
        "config" : {
            "user" : "admin",
            "password" : "admin",
            "host" : "190.121.18.13"
        },
        "node" : "59db1dc1423ad2cc0650f8bc"
    };

    beforeEach(function(){
        job = new WsmanJob({}, {"nodeId": uuid.v4()}, uuid.v4());
        sandbox.stub(configuration, 'get');
        sandbox.stub(validator, 'isIP');
        sandbox.stub(WsmanTool.prototype, 'clientRequest');
        sandbox.stub(Smb2Client.prototype, 'deleteFile');
        sandbox.stub(NfsClient.prototype, 'deleteFile');
        sandbox.stub(NfsClient.prototype, 'umount');
    });

    afterEach(function(){
        sandbox.restore();
    });

    it('Should init wsman RAID job succesfully', function(){
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


    describe('handleSyncResponse function cases', function(){
        it('Should delete cifs file succesfully', function(){
            var response = {
                "body": '{"status":"OK"}'
            };
            job.options.removeXmlFile = true;
            job.dell = {
                "shareFolder": {
                    "shareAddress": "192.128.10.23",
                    "shareName": "RAID",
                    "sharePassword": "123456",
                    "shareType": "2",
                    "shareUsername": "admin"
                }
            };
            Smb2Client.prototype.deleteFile.resolves({});
            expect(job._handleSyncResponse(response)).to.be.fulfilled;
        });

        it('Should delete nfs file and umount directory successfully', function(){
            var response = {
                "body": '{"status":"OK"}'
            };
            job.options.removeXmlFile = true;
            job.dell = {
                "shareFolder": {
                    "shareAddress": "192.128.10.23",
                    "shareName": "RAID",
                    "shareType": "0"
                }
            };
            NfsClient.prototype.deleteFile.resolves({});
            expect(job._handleSyncResponse(response)).to.be.fulfilled;
        });

        it('Should not delete file', function(){
            var response = {
                "body": '{"status":"OK"}'
            };
            job.options.removeXmlFile = false;
            expect(job._handleSyncResponse(response)).to.equal(response);
        });

        it('Should throw an error: Failed to do RAID operation', function(){
            var response = {
                "body": '{"status":"fail"}'
            };
            expect(function(){
                job._handleSyncResponse(response);
            }).to.throw('Failed to do RAID operations');
        });
    });

    it('Should send RAID request succesfully', function(){
        validator.isIP.returns(true);
        job.dell = configFile;
        var response = {
            "body": {
                "response": "Request Submitted"
            }
        };
        WsmanTool.prototype.clientRequest.resolves(response);
        expect(job.doRAIDoperation(obms)).to.be.fulfilled;
    });

    it('Should throw an error: Invalid ServerIP', function(){
        validator.isIP.returns(false);
        expect(function(){
            job.doRAIDoperation(obms);
        }).to.throw('Invalid ServerIP');
    });

});
