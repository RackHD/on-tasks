// Copyright 2016, EMC, Inc.
/* jshint node: true */

'use strict';

describe("racadm-parser", function() {
    var parser;
    var racadmOutMock;

    before('racadm parser before', function() {
        helper.setupInjector([
            helper.require('/spec/mocks/logger.js'),
            helper.require('/lib/utils/job-utils/racadm-parser')
        ]);

        parser = helper.injector.get('JobUtils.RacadmCommandParser');
        racadmOutMock = require('./stdout-helper');
    });

    describe("Software Inventory Parser", function() {
        it("should parse dell server software inventory", function() {
            var tasks = racadmOutMock.racadmSoftwareInventory;
            var result = parser.getSoftwareList(tasks);
            expect(result.iDRAC).to.deep.equal({
                FQDD: 'iDRAC.Embedded.1-1',
                installationDate: '2016-01-11T21:55:32Z',
                currentVersion: '2.23.23.21',
                rollbackVersion: '2.20.20.20',
                elementName: 'Integrated Dell Remote Access Controller',
                availableVersion: ''
            });
            expect(result.NIC1).to.deep.equal({
                FQDD: 'NIC.Embedded.1-1-1',
                installationDate: '2015-11-26T06:54:17Z',
                currentVersion: '16.5.0',
                elementName: 'Intel(R) Ethernet 10G X520 LOM - 00:8C:FA:F3:78:30',
                availableVersion: '',
                rollbackVersion: ''
            });
            expect(result.NIC2).to.deep.equal({
                FQDD: 'NIC.Embedded.2-1-1',
                installationDate: '2015-11-26T06:54:20Z',
                currentVersion: '16.5.0',
                elementName: 'Intel(R) Ethernet 10G X520 LOM - 00:8C:FA:F3:78:32',
                availableVersion: '',
                rollbackVersion: ''
            });
            expect(result.BIOS).to.deep.equal({
                FQDD: 'BIOS.Setup.1-1',
                installationDate: '2015-11-26T06:54:10Z',
                currentVersion: '1.0.3',
                rollbackVersion: '1.0.3',
                availableVersion: '1.0.3',
                elementName: 'BIOS'
            });
            expect(result.Disk1).to.deep.equal({
                FQDD: 'Disk.Bay.1:Enclosure.Internal.0-0:RAID.Slot.1-1',
                installationDate: '2015-11-26T07:28:09Z',
                currentVersion: 'TS04',
                elementName: 'Disk 1 in Backplane 0 of RAID Controller in Slot 1',
                availableVersion: '',
                rollbackVersion: ''
            });
            expect(result.Disk2).to.deep.equal({
                FQDD: 'Disk.Bay.2:Enclosure.Internal.0-0:RAID.Slot.1-1',
                installationDate: '2015-11-26T07:28:09Z',
                currentVersion: 'TS04',
                elementName: 'Disk 2 in Backplane 0 of RAID Controller in Slot 1',
                availableVersion: '',
                rollbackVersion: ''
            });
        });

        it("should report errors", function() {
            var tasks = 'anything = for test';
            expect(function(){
                parser.getSoftwareList(tasks);
            }).to.throw(Error, "software list data is not aligned in correct way");
        });
    });

    describe("Parse file path", function() {
        it("should parse  remote filename and path", function() {
            var data = "//192.168.191.207/share/bios.xml";
            var result = parser.getPathFilename(data);
            expect(result.path).to.equal('//192.168.191.207/share');
            expect(result.name).to.equal('bios.xml');
            expect(result.style).to.equal('remote');
        });

        it("should parse  remote filename and path", function() {
            var data = "/home/share/bios.xml";
            var result = parser.getPathFilename(data);
            expect(result.path).to.equal('/home/share');
            expect(result.name).to.equal('bios.xml');
            expect(result.style).to.equal('local');
        });

        it("should report path format incorrect", function() {
            var data = "home/share/bios.xml";
            expect(function() {
                parser.getPathFilename(data);
            }).to.throw(Error, 'file path format is incorrect');
        });

    });

    describe("Parse  JID", function() {
        it("should filter JID from console standard output", function() {
            var data = racadmOutMock.racadmJobIdData;
            var result = parser.getJobId(data);
            expect(result).to.equal('JID_541335487816');
        });

        it("should report can't parser JID", function() {
            var data = 'any string';
            expect(function() {
                parser.getJobId(data);
            }).to.throw(Error, 'can not find JID_ index in console standard output message');
        });

    });

    describe("Parser job status", function() {
        it("should parser job status", function() {
            var data = racadmOutMock.racadmJobStatusData;
            var result = parser.getJobStatus(data);
            expect(result.jobId).to.equal('JID_541347990377');
            expect(result.jobName).to.equal('Configure: Import system configuration XML file');
            expect(result.status).to.equal('Completed');
            expect(result.startTime).to.equal('Not Applicable');
            expect(result.expirationTime).to.equal('Not Applicable');
            expect(result.message).to.equal('SYS054: No configuration changes requiring a system ' +
                'restart need to be applied.');
            expect(result.percentComplete).to.equal('100');
        });

        it("should report job status format is not correct", function() {
            var data = 'any string';
            expect(function() {
                parser.getJobStatus(data);
            }).to.throw(Error, 'job status format is not correct');
        });

    });

});
