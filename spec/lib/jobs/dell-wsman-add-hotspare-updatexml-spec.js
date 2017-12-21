// Copyright 2017 Dell Inc. or its subsidiaries.  All Rights Reserved.

'use strict';

var uuid = require('node-uuid');

describe(require('path').basename(__filename), function () {
    var UpdateXmlJob;
    var updateXmlJob;
    var configuration;
    var smb2Clinet;
    var nfsClinet;
    var baseJob;

    var dellConfigs = {
        shareFolder: {
            address: '1.1.1.1',
            shareName: 'test',
            username: 'test',
            password: 'test',
            shareType: 2
        }
    };

    var xml =  '<SystemConfiguration>' +
            '<Component FQDD="RAID.Slot.1-1">' +
                '<Component FQDD="Disk.Virtual.0:RAID.Slot.1-1">' +
                    '<Attribute Name="RAIDaction">Update</Attribute>' +
                '</Component>' +
                '<Component FQDD="Enclosure.Internal.0-0:RAID.Slot.1-1">' +
                    '<Component FQDD="Disk.Bay.0:Enclosure.Internal.0-0:RAID.Slot.1-1">' +
                        '<!-- <Attribute Name="RAIDHotSpareStatus">No</Attribute> -->' +
                    '</Component>' +
                '</Component>' +
            '/Component' +
        '</SystemConfiguration>';
    var xmlData = Buffer.from(xml, 'utf-8');

    before(function() {
        helper.setupInjector([
            helper.require('/lib/jobs/base-job'),
            helper.require('/lib/jobs/dell-wsman-add-hotspare-updatexml.js'),
            helper.require('/lib/utils/job-utils/smb2-client.js'),
            helper.require('/lib/utils/job-utils/nfs-client.js')
        ]);
        UpdateXmlJob = helper.injector.get('Job.Dell.Wsman.Add.Hotspare.UpdateXml');
        baseJob = helper.injector.get('Job.Base');
        configuration = helper.injector.get('Services.Configuration');
        smb2Clinet = helper.injector.get('JobUtils.Smb2Client');
        nfsClinet = helper.injector.get('JobUtils.NfsClient');
        this.sandbox = sinon.sandbox.create();
    });

    beforeEach(function() {
        var options = {
            driveId: 'Disk.Bay.0:Enclosure.Internal.0-0:RAID.Slot.1-1',
            volumeId: 'Disk.Virtual.0:RAID.Slot.1-1',
            hotspareType: 'ghs'
        };
        updateXmlJob = new UpdateXmlJob(options, {}, uuid.v4());
        this.sandbox.stub(configuration, 'get').returns(dellConfigs);
    });

    afterEach(function() {
        this.sandbox.restore();
    });

    describe('_run', function() {
        it('should handle case: inputed driveId is empty', function() {
            updateXmlJob.options.driveId = '';
            return expect(function() {
                updateXmlJob._run();
            }).to.throw('The driveId should not be empty.');
        });

        it('should handle case: share folder is not defined in smlConfig', function() {
            var dellConfigurations = {
                services: {}
            };
            configuration.get.returns(dellConfigurations);
            return expect(function() {
                updateXmlJob._run();
            }).to.throw('Share folder is not defined in smiConfig.json');
        });

        it('should run successfully', function() {
            this.sandbox.stub(UpdateXmlJob.prototype, 'updateXmlForRaid');
            updateXmlJob._run();
            return expect(UpdateXmlJob.prototype.updateXmlForRaid).to.be.called;
        });
    });

    describe('updateXmlForRaid', function() {
        beforeEach(function() {
            this.sandbox.stub(UpdateXmlJob.prototype, 'updateXml');
        });

        it('should throw error if shareType defined in smiConfig is invalid', function() {
            var dellConfigurations = {
                shareFolder: {
                    shareType: 3
                }
            };
            updateXmlJob.dell = dellConfigurations;
            this.sandbox.stub(baseJob.prototype, '_done');
            return updateXmlJob.updateXmlForRaid()
            .then(function() {
                expect(baseJob.prototype._done).to.
                    be.calledWith(new Error('Invalid shareType in smiConfig.json. The shareType should be 0 or 2.'));
            });
        });

        it('should update xml in CIFS successfully', function() {
            var config = {
                shareFolder: {
                    shareType: 2,
                    address: '1.1.1.1',
                    username: 'username',
                    password: 'password',
                }
            };
            updateXmlJob.dell = config;
            this.sandbox.stub(smb2Clinet.prototype, 'readFile').resolves(xmlData);
            this.sandbox.stub(smb2Clinet.prototype, 'writeFile').resolves();
            return expect(updateXmlJob.updateXmlForRaid()).to.be.fulfilled;
        });

        it('should update xml in NFS succesfully', function() {
            var config = {
                shareFolder: {
                    shareType: 0,
                    address: '1.1.1.1',
                    username: 'username',
                    password: 'password',
                }
            };
            updateXmlJob.dell = config;
            this.sandbox.stub(nfsClinet.prototype, 'readFile').resolves(xmlData);
            this.sandbox.stub(nfsClinet.prototype, 'writeFile');
            return expect(updateXmlJob.updateXmlForRaid()).to.be.fulfilled;
        });

        it('should catch error occurred while updating xml', function() {
            updateXmlJob.dell = dellConfigs;
            this.sandbox.stub(smb2Clinet.prototype, 'readFile').rejects('test');
            this.sandbox.stub(baseJob.prototype, '_done');
            return updateXmlJob.updateXmlForRaid()
            .then(function() {
                expect(baseJob.prototype._done).to.be.calledWith(new Error('test'));
            });
        });
    });

    describe('updateXml', function() {
        it('should handle case: volumeId is empty', function() {
            updateXmlJob.options.volumeId = '';
            updateXmlJob.options.hotspareType = 'dhs';
            return expect(function() {
                updateXmlJob.updateXml(xmlData);
            }).to.throw('The volumeId should not be empty.');
        });

        it('should update xml successfully for adding global hotspare', function() {
            var raidStatus;
            var doc = updateXmlJob.updateXml(xmlData);
            var components = doc.getElementsByTagName('Component');
            for(var i = 0; i < components.length; i++) { //jshint ignore:line
                var fqdd = components[i].getAttribute('FQDD');
                if(fqdd === updateXmlJob.options.driveId) {
                    var attributes = components[i].getElementsByTagName('Attribute');
                    for(var j = 0; j < attributes.length; j++) { //jshint ignore:line
                        var name = attributes[j].getAttribute('Name');
                        if(name === 'RAIDHotSpareStatus') {
                            raidStatus = attributes[j].textContent;
                            break;
                        }
                    }
                }
            }
            return expect(raidStatus).to.be.equal('Global');
        });

        it('should update xml successfully for adding dedicated hotspare', function() {
            updateXmlJob.options.hotspareType = 'dhs';
            var succeed = false;
            var doc = updateXmlJob.updateXml(xmlData);
            var components = doc.getElementsByTagName('Component');
            for(var i = 0; i < components.length; i++) { //jshint ignore:line
                var fqdd = components[i].getAttribute('FQDD');
                if(fqdd === updateXmlJob.options.volumeId) {
                    var attributes = components[i].getElementsByTagName('Attribute');
                    for(var j = 0; j < attributes.length; j++) { //jshint ignore:line
                        var name = attributes[j].getAttribute('Name');
                        if(name === 'RAIDdedicatedSpare' &&
                            attributes[j].textContent === updateXmlJob.options.driveId) {
                            succeed = true;
                            break;
                        }
                    }
                }
            }
            return expect(succeed).to.be.equal(true);
        });
    });
});
