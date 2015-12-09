// Copyright 2015, EMC, Inc.

'use strict';

var di = require('di');

module.exports = searchCatalogDataFactory;
di.annotate(searchCatalogDataFactory, new di.Provide('JobUtils.CatalogSearchHelpers'));
di.annotate(searchCatalogDataFactory, new di.Inject(
    'Assert',
    '_'
));

function searchCatalogDataFactory(
    assert,
    _
) {
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

    /**
     * Search the driveid catalog and lookup the corresponding drive WWID by the input
     * drive index.
     * @param {Object} catalog - the catalog data of drive id
     * @param {Boolean} isEsx - True to return the ESXi formated wwid,
     *                          otherwise linux format wwid.
     * @param {Number} driveIndex - The drive index
     * @return {String} The WWID for the target drive. If failed, return null
     */
    function findDriveWwidByIndex(catalog, isEsx, driveIndex) {
        var wwid = null;
        _.forEach(catalog, function(entry) {
            if (entry.identifier === driveIndex) {
                wwid = isEsx ? entry.esxiWwid : entry.linuxWwid;
                return false; //have found the result, so we can exit iteration early.
            }
        });
        return wwid;
    }

    return {
        getPath: getPath,
        findDriveWwidByIndex: findDriveWwidByIndex
    };
}
