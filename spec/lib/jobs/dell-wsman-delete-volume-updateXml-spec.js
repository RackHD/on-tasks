// Copyright © 2017 Dell Inc. or its subsidiaries. All Rights Reserved.

'use strict';

describe('Dell Wsman Delete Volume XML Job', function(){
    var WsmanJob;
    var uuid;
    var job;
    var sandbox = sinon.sandbox.create();
    var configuration;
    var Smb2Client;

    before(function(){
        helper.setupInjector([
            helper.require('/spec/mocks/logger.js'),
            helper.require('/lib/jobs/base-job.js'),
            helper.require('/lib/jobs/dell-wsman-delete-volume-updateXml.js'),
            helper.require('/lib/utils/job-utils/smb2-client.js')
        ]);
        WsmanJob = helper.injector.get('Job.Dell.Wsman.Delete.Volume.UpdateXml');
        uuid = helper.injector.get('uuid');
        configuration = helper.injector.get('Services.Configuration');
        Smb2Client = helper.injector.get('JobUtils.Smb2Client');
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
            "address": "191.162.10.13",
            "shareName": "RAID",
            "username": "admin",
            "password": "123456",
            "shareType": 2
        }
    };

    var file = "<SystemConfiguration>" +
        "<Component FQDD='RAID.Slot.1-1'>" +
            "<Component FQDD='Disk.Virtual.0:RAID.Slot.1-1'>" +
                "<Attribute Name='RAIDaction'>Update</Attribute>" +
            "</Component>" +
            "<Component FQDD='Disk.Virtual.1:RAID.Slot.1-1'>" +
                "<Attribute Name='RAIDaction'>Update</Attribute>" +
            "</Component>" +
        "</Component>" +
        "</SystemConfiguration>";
    var fileData = Buffer.from(file, 'utf-8');

    beforeEach(function(){
        job = new WsmanJob({}, {"nodeId": uuid.v4()}, uuid.v4());
        sandbox.stub(configuration, 'get');
        sandbox.stub(job, 'parseXmlFileForRAID');
    });

    afterEach(function(){
        sandbox.restore();
    });


    it('Should init wsman wsmanDeleteVolumeXml job succesfully', function(){
        configuration.get.returns(configFile);
        job.options.volumeId = "Disk.Virtual.0:RAID.Slot.1-1";
        expect(function(){
            job._run();
        }).to.not.throw('The shareFolder is not defined in smiConfig.json.');
         expect(function(){
            job._run();
        }).to.not.throw('The volumeId can not be empty string.');
    });

    it('Should throw an error: Dell SCP  web service is not defined', function(){
        configuration.get.returns({});
        expect(function(){
            job._run();
        }).to.throw('The shareFolder is not defined in smiConfig.json.');
    });

    it('Should throw an error: The volumeId can not be empty string', function(){
        configuration.get.returns(configFile);
        job.options.volumeId = "";
        expect(function(){
            job._run();
        }).to.throw('The volumeId can not be empty string.');
    });

    it('Should parse xml file for RAID operation successfully', function(){
        sandbox.restore();
        sandbox.stub(Smb2Client.prototype, 'readFile');
        sandbox.stub(Smb2Client.prototype, 'writeFile');
        job.dell = configFile;
        job.context.graphName = 'parseXmlFileForRAID';
        job.options.volumeId = 'Disk.Virtual.1:RAID.Slot.1-1';
        Smb2Client.prototype.readFile.resolves(fileData);
        expect(job.parseXmlFileForRAID()).to.be.fulfilled;
    });

});
