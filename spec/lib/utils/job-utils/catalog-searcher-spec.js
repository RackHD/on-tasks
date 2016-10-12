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
            controllerData;

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
                    controllerVender: 'lsi'
                },
                driveIdData[1]);
            virtualDiskData = JSON.parse(stdoutMocks.storcliVirtualDiskInfo);
            controllerData = JSON.parse(stdoutMocks.storcliAdapterInfo);
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
                    expect(waterline.catalogs.findMostRecent).to.have.been.calledThrice;
                });
        });

        it('should return correct extended driveId catalogs with filter', function () {
            return catalogSearch.getDriveIdCatalogExt('1234', { 'sda': 1, '5': 1 })
                .then(function (catalogExt) {
                    expect(catalogExt).that.is.an('array').with.length(2);
                    expect(catalogExt[0]).to.deep.equals(driveIdExt1);
                    expect(waterline.catalogs.findMostRecent).to.have.been.calledThrice;
                });
        });

        it('should skip extention when all virtualDisk field empty', function () {
            waterline.catalogs.findMostRecent
                .withArgs({ node: '5678', source: 'driveId'})
                .resolves({ data: [ driveIdData[0] ] });
            return catalogSearch.getDriveIdCatalogExt('5678')
                .then(function (catalogExt) {
                    expect(catalogExt).that.is.an('array').with.length(1);
                    expect(catalogExt[0]).to.deep.equals(driveIdData[0]);
                    expect(waterline.catalogs.findMostRecent).to.have.been.calledOnce; 
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
            return expect(catalogSearch.getDriveIdCatalogExt('5678')).to.be
                .rejectedWith('Could not find megaraid-virtual-disks catalog data.');
        });
    });
});
