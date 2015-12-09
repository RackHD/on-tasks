// Copyright 2015, EMC
/* jshint node: true */

'use strict';

var catalogSearch;

describe("Catalog Searcher", function () {
    before("Catalog Searcher before", function() {
        helper.setupInjector([
            helper.require('/lib/utils/job-utils/catalog-searcher')
        ]);
        catalogSearch = helper.injector.get('JobUtils.CatalogSearchHelpers');
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
});
