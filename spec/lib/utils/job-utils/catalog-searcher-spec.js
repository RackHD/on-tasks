// Copyright 2015, EMC
/* jshint node: true */

'use strict';

var catalogSearch;

describe("Catalog Searcher", function () {
    var waterline;

    before("Catalog Searcher before", function() {
        helper.setupInjector([
            helper.require('/lib/utils/job-utils/catalog-searcher')
        ]);
        catalogSearch = helper.injector.get('JobUtils.CatalogSearchHelpers');
        waterline = helper.injector.get('Services.Waterline');
    });

    describe('get path', function() {
        var getPath;

        before('get path before', function() {
            getPath = catalogSearch.getPath;
        });

        it('should get the value for a path', function() {
            var obj = {
                'foo': {
                    'bar': {
                        'baz': 'value'
                    }
                }
            };
            var path = 'foo.bar.baz';
            expect(getPath(obj, path)).to.equal('value');
        });

        it('should return undefined if value does not exist', function() {
            var obj = {
                'foo': {
                    'bar': {
                        'notbaz': 'notvalue'
                    }
                }
            };
            var path = 'foo.bar.baz';
            expect(getPath(obj, path)).to.equal(undefined);
        });
    });

    describe('findDriveWwidByIndex', function() {
        var catalog = [
            {
                identifier: 0,
                linuxWwid: '/dev/test0',
                esxiWwid: 't10.abcde'
            },
            {
                identifier: 1,
                linuxWwid: '/dev/test1',
                esxiWwid: 'naa.rstuvw'
            },
            {
                identifier: 2,
                linuxWwid: '/dev/test2',
                esxiWwid: 'naa.xyzopq'
            }
        ];

        it('should return correct linux wwid', function() {
            expect(catalogSearch.findDriveWwidByIndex(catalog, false, 0)).to.equal('/dev/test0');
            expect(catalogSearch.findDriveWwidByIndex(catalog, false, 1)).to.equal('/dev/test1');
            expect(catalogSearch.findDriveWwidByIndex(catalog, false, 2)).to.equal('/dev/test2');
        });

        it('should return correct esxi wwid', function() {
            expect(catalogSearch.findDriveWwidByIndex(catalog, true, 0)).to.equal('t10.abcde');
            expect(catalogSearch.findDriveWwidByIndex(catalog, true, 1)).to.equal('naa.rstuvw');
            expect(catalogSearch.findDriveWwidByIndex(catalog, true, 2)).to.equal('naa.xyzopq');
        });

        it('should return null if driveIndex is not correct', function() {
            expect(catalogSearch.findDriveWwidByIndex(catalog, false, 9)).to.be.null;
            expect(catalogSearch.findDriveWwidByIndex(catalog, true, 3)).to.be.null;
            expect(catalogSearch.findDriveWwidByIndex(catalog, false)).to.be.null;
        });

        it('should return null if catalog data is empty', function() {
            expect(catalogSearch.findDriveWwidByIndex([], false, 0)).to.be.null;
            expect(catalogSearch.findDriveWwidByIndex([], false, 1)).to.be.null;
            expect(catalogSearch.findDriveWwidByIndex(undefined, false, 0)).to.be.null;
        });
    });

    describe('getDriveIdCatalogExt', function () {
        var stdoutMocks,
            driveIdExt1,
            driveIdData,
            virtualDiskData,
            controllerData,
            physicalDiskData;

        before('before', function() {
            stdoutMocks = require('./stdout-helper');
            driveIdData = JSON.parse(stdoutMocks.driveidOutput);
            driveIdExt1 = _.merge(
                {
                    size: '558.406 GB',
                    type: 'RAID0',
                    physicalDisks: [
                        {
                            deviceId: 23,
                            enclosureId: '36',
                            slotId: '0',
                            size: '558.406 GB',
                            protocol: 'SAS',
                            type: 'HDD',
                            model: 'ST3600057SS '
                        }
                    ],
                    deviceIds: [23],
                    slotIds: ['/c0/e36/s0'],
                    controllerId: '0',
                    controllerVendor: 'lsi'
                },
                driveIdData[1]);
            virtualDiskData = JSON.parse(stdoutMocks.storcliVirtualDiskInfo);
            controllerData = JSON.parse(stdoutMocks.storcliAdapterInfo);
            physicalDiskData = JSON.parse(stdoutMocks.megaraidPhysicalDiskData);
            waterline.catalogs = { findMostRecent: sinon.stub() };
        });

        beforeEach('before each', function () {
            waterline.catalogs.findMostRecent.reset();
            waterline.catalogs.findMostRecent
                .withArgs({ node: '1234', source: 'driveId'})
                .resolves({ data: driveIdData });
            waterline.catalogs.findMostRecent
                .withArgs({ node: '1234', source: 'megaraid-virtual-disks'})
                .resolves({ data: virtualDiskData});
            waterline.catalogs.findMostRecent
                .withArgs({ node: '1234', source: 'megaraid-controllers'})
                .resolves({ data: controllerData});
            driveIdData = JSON.parse(stdoutMocks.driveidOutput);
        });

        it('should return correct extended driveId catalogs', function () {
            return catalogSearch.getDriveIdCatalogExt('1234')
                .then(function (catalogExt) {
                    expect(catalogExt).that.is.an('array').with.length(4);
                    expect(catalogExt[1]).to.deep.equals(driveIdExt1);
                    expect(waterline.catalogs.findMostRecent.callCount).to.equal(3);
                });
        });

        it('should return correct extended driveId catalogs with filter', function () {
            return catalogSearch.getDriveIdCatalogExt('1234', [ 'sda', 5])
                .then(function (catalogExt) {
                    expect(catalogExt).that.is.an('array').with.length(2);
                    expect(catalogExt[0]).to.deep.equals(driveIdExt1);
                    expect(waterline.catalogs.findMostRecent).to.have.been.calledThrice;
                });
        });

        it('should skip extention when all virtualDisk field empty', function () {
            waterline.catalogs.findMostRecent
                .withArgs({ node: '5678', source: 'megaraid-controllers'})
                .resolves();
            waterline.catalogs.findMostRecent
                .withArgs({ node: '5678', source: 'megaraid-virtual-disks'})
                .resolves();
            waterline.catalogs.findMostRecent
                .withArgs({ node: '5678', source: 'driveId'})
                .resolves({ data: [ driveIdData[0] ] });
            return catalogSearch.getDriveIdCatalogExt('5678')
                .then(function (catalogExt) {
                    expect(catalogExt).that.is.an('array').with.length(1);
                    expect(catalogExt[0]).to.deep.equals(driveIdData[0]);
                    expect(waterline.catalogs.findMostRecent).to.have.been.calledOnce;
                    expect(waterline.catalogs.findMostRecent).to.have.been.calledWith(
                        { node: '5678', source: 'driveId'}
                    );
                    expect(waterline.catalogs.findMostRecent).to.have.not.been.calledWith(
                        { node: '5678', source: 'megaraid-controllers'}
                    );
                    expect(waterline.catalogs.findMostRecent).to.have.not.been.calledWith(
                        { node: '5678', source: 'megaraid-virtual-disks'}
                    );
                });
        });

        it('should be rejected with driveId catalog not found', function () {
            waterline.catalogs.findMostRecent
                .withArgs({ node: '5678', source: 'driveId'}).resolves();
            return expect(catalogSearch.getDriveIdCatalogExt('5678')).to.be
                .rejectedWith('Could not find driveId catalog data.');
        });

        it('should be rejected with megaraid-virtual-disks catalog not found', function () {
            waterline.catalogs.findMostRecent
                .withArgs({ node: '5678', source: 'driveId'})
                .resolves({ data: driveIdData });
            waterline.catalogs.findMostRecent
                .withArgs({ node: '5678', source: 'megaraid-virtual-disks'})
                .resolves();
            waterline.catalogs.findMostRecent
                .withArgs({ node: '5678', source: 'megaraid-controllers'})
                .resolves({data: {Controllers: []}});
            return expect(catalogSearch.getDriveIdCatalogExt('5678')).to.be
                .rejectedWith('Could not find megaraid-virtual-disks catalog data.');
        });

        it('should be rejected with megaraid-controllers catalog not found', function () {
            waterline.catalogs.findMostRecent
                .withArgs({ node: '5678', source: 'driveId'})
                .resolves({ data: driveIdData });
            waterline.catalogs.findMostRecent
                .withArgs({ node: '5678', source: 'megaraid-virtual-disks'})
                .resolves({data: {Controllers: [0]}});
            waterline.catalogs.findMostRecent
                .withArgs({ node: '5678', source: 'megaraid-controllers'})
                .resolves({});
            return expect(catalogSearch.getDriveIdCatalogExt('5678')).to.be
                .rejectedWith('Could not find megaraid-controllers catalog data.');
        });

        it('should extend catalog for disk without virtual disk info', function () {
            var driveIds = [{
                    "devName": "sdb",
                    "esxiWwid": "naa.5000c5008ed29de3",
                    "identifier": 2,
                    "linuxWwid": "/dev/disk/by-id/scsi-35000c5008ed29de3",
                    "scsiId": "0:0:4:0",
                    "virtualDisk": ""
                }],
                driveIdExt = [_.merge(
                    {
                        size: '1.091 TB',
                        type: 'JBOD',
                        physicalDisks: [
                            {
                                deviceId: 4,
                                enclosureId: '252',
                                slotId: '4',
                                size: '1.091 TB',
                                protocol: 'SAS',
                                type: 'HDD',
                                model: 'ST1200MM0088    '
                            }
                        ],
                        deviceIds: [4],
                        slotIds: ['/c0/e252/s4'],
                        controllerId: '0',
                        controllerVendor: undefined
                    },
                    driveIds[0]
                )];
            waterline.catalogs.findMostRecent
                .withArgs({ node: '578', source: 'driveId'}).resolves({data: driveIds});
            waterline.catalogs.findMostRecent
                .withArgs({ node: '578', source: 'megaraid-physical-drives'})
                .resolves(physicalDiskData);
            waterline.catalogs.findMostRecent
                .withArgs({ node: '578', source: 'megaraid-controllers'})
                .resolves({data: {Controllers: []}});
            return catalogSearch.getDriveIdCatalogExt('578', ["sdb"], true)
                .then(function(_driveIdExt){
                    expect(_driveIdExt).to.deep.equals(driveIdExt);
                });
        });

        it('should not extend catalog for disk without virtual disk info', function () {
            var driveIds = [{
                    "devName": "sdb",
                    "esxiWwid": "naa.5000c5008ed29de3",
                    "identifier": 2,
                    "linuxWwid": "/dev/disk/by-id/scsi-35000c5008ed29de3",
                    "scsiId": "0:0:4:0",
                    "virtualDisk": ""
                }];
            waterline.catalogs.findMostRecent
                .withArgs({ node: '578', source: 'driveId'}).resolves({data: driveIds});
            waterline.catalogs.findMostRecent
                .withArgs({ node: '578', source: 'megaraid-physical-drives'})
                .resolves(physicalDiskData);
            waterline.catalogs.findMostRecent
                .withArgs({ node: '578', source: 'megaraid-controllers'})
                .resolves({data: {Controllers: []}});
            return catalogSearch.getDriveIdCatalogExt('578')
                .then(function(_driveIdExt){
                    expect(_driveIdExt).to.deep.equals(driveIds);
                });
        });

        it('should report can not find physical drives error', function (done) {
            waterline.catalogs.findMostRecent
                .withArgs({ node: '5678', source: 'driveId'})
                .resolves({data: driveIdData});
            waterline.catalogs.findMostRecent
                .withArgs({ node: '5678', source: 'megaraid-controllers'})
                .resolves({data: controllerData});
            waterline.catalogs.findMostRecent
                .withArgs({ node: '5678', source: 'megaraid-virtual-disks'})
                .resolves({data: virtualDiskData});
            waterline.catalogs.findMostRecent
                .withArgs({ node: '5678', source: 'megaraid-physical-drives'})
                .resolves({});
            catalogSearch.getDriveIdCatalogExt('5678', [], true)
                .then(function () {
                    done(new Error("Test should fail"));
                })
                .catch(function(err){
                    expect(err.message)
                        .to.equal("Could not find megaraid-physical-drives catalog data.");
                    done();
                });
        });

    });
});
