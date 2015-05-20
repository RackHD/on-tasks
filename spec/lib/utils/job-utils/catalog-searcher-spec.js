// Copyright 2015, EMC
/* jshint node: true */

'use strict';

describe("Catalog Searcher", function () {
    before("Catalog Searcher before", function() {
        helper.setupInjector([
            helper.require('/lib/utils/job-utils/catalog-searcher')
        ]);
    });

    describe('get path', function() {
        var getPath;

        before('get path before', function() {
            getPath = helper.injector.get('JobUtils.CatalogSearchHelpers').getPath;
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
});
