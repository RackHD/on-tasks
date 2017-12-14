// Copyright © 2017 Dell Inc. or its subsidiaries. All Rights Reserved.

'use strict';

describe('Dell Wsman Add Volume Update XML Job', function(){
    var WsmanJob;
    var uuid;
    var job;
    var sandbox = sinon.sandbox.create();
    var configuration;
    var Smb2Client;
    var NfsClient;

    before(function(){
        helper.setupInjector([
            helper.require('/spec/mocks/logger.js'),
            helper.require('/lib/jobs/base-job.js'),
            helper.require('/lib/jobs/dell-wsman-add-volume-updateXml.js'),
            helper.require('/lib/utils/job-utils/smb2-client.js'),
            helper.require('/lib/utils/job-utils/nfs-client.js')
        ]);
        WsmanJob = helper.injector.get('Job.Dell.Wsman.Add.Volume.UpdateXml');
        uuid = helper.injector.get('uuid');
        configuration = helper.injector.get('Services.Configuration');
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
        "<Component FQDD='Enclosure.Internal.0-0:RAID.Slot.1-1'>" +
            "<Component FQDD='Disk.Bay.0:Enclosure.Internal.0-0:RAID.Slot.1-1'>" +
            "</Component>" +
            "<Component FQDD='Disk.Bay.1:Enclosure.Internal.0-0:RAID.Slot.1-1'>" +
            "</Component>" +
        "</Component>" +
    "</SystemConfiguration>";
    var fileData = Buffer.from(file, 'utf-8');
    var options = {
        'drives': 'Disk.Bay.0:Enclosure.Internal.0-0:RAID.Slot.1-1,Disk.Bay.1:Enclosure.Internal.0-0:RAID.Slot.1-1',
        'raidLevel': 'RAID 0',
        'name': 'test-raid',
        'stripeSize': 128,
        'writePolicy': 'WriteBack'
    };

    beforeEach(function(){
        job = new WsmanJob({}, {"nodeId": uuid.v4()}, uuid.v4());
        sandbox.stub(configuration, 'get');
        sandbox.stub(job, 'parseXmlFileForRAID');
    });

    afterEach(function(){
        sandbox.restore();
    });

    it('Should throw an error: the shareFolder is not be defined', function(){
        var configFile = {
            "services": {
                "configuration": {
                    "getComponents": "",
                    "updateComponents": "",
                    "configureBios": "/api/1.0/server/configuration/configureBios"
                }
            }
        };
        configuration.get.returns(configFile);
        expect(function(){
            job._run();
        }).to.throw('The shareFolder is not defined in smiConfig.json.');
    });

    it('Should throw an error: the drives can not be empty string', function(){
        configuration.get.returns(configFile);
        job.options.drives = '';
        expect(function(){
            job._run();
        }).to.throw('The drives can not be empty string.');
    });

    it('Should parse xml file for cifs successfully', function(){
        sandbox.restore();
        sandbox.stub(Smb2Client.prototype, 'readFile');
        sandbox.stub(Smb2Client.prototype, 'writeFile');
        job.dell = configFile;
        job.options = options;
        Smb2Client.prototype.readFile.resolves(fileData);
        return expect(job.parseXmlFileForRAID()).to.be.fulfilled;
    });

    it('Should parse xml file for nfs successfully', function(){
        sandbox.restore();
        sandbox.stub(NfsClient.prototype, 'readFile');
        sandbox.stub(NfsClient.prototype, 'writeFile');
        job.dell = {
            "shareFolder": {
                "address": "191.162.10.13",
                "shareName": "RAID",
                "shareType": 0
            }
        };
        job.options = options;
        NfsClient.prototype.readFile.resolves(fileData);
        return expect(job.parseXmlFileForRAID()).to.be.fulfilled;
    });
});
