// Copyright 2015, EMC, Inc.
/* jshint node: true */

'use strict';

var di = require('di');

module.exports = searchCatalogDataFactory;
di.annotate(searchCatalogDataFactory, new di.Provide('JobUtils.CatalogSearchHelpers'));
di.annotate(searchCatalogDataFactory, new di.Inject('Assert'));
function searchCatalogDataFactory(assert) {
    function getPath(obj, path) {
        if (path === null || path === undefined || obj === null || obj === undefined) {
            return undefined;
        }
        if (!Array.isArray(path)) {
            assert.string(path);
            path = path.split('.');
        }
        var value = obj[path[0]];
        if (path.length === 1) {
            return value;
        }
        return getPath(value, path.slice(1));
    }

    return {
        getPath: getPath,
    };
}
