// Copyright 2015, EMC, Inc.

'use strict';

var di = require('di');

module.exports = searchCatalogDataFactory;
di.annotate(searchCatalogDataFactory, new di.Provide('JobUtils.CatalogSearchHelpers'));
di.annotate(searchCatalogDataFactory, new di.Inject(
    'Assert',
    '_',
    'Services.Waterline'
));

function searchCatalogDataFactory(
    assert,
    _,
    waterline
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

    /**
     * Get extended driveId catalog data with virtual disk info from megaraid-virtual-disks
     * @param {String} nodeId - node identifier
     * @param {Object} filter - [optional] The filter which contains the driveId catalogs identifier
     *                          Or devName. For example: {'sda': 1, 'sdb': 1, '3': 1}. 
     *                          driveId catalogs in filter will return, otherwise skip.
     * @return {Promise} driveId catalogs extended
     */
    function getDriveIdCatalogExt(nodeId, filter) {
        var virtualDiskData, controllerData;

        return waterline.catalogs.findMostRecent({
            node: nodeId,
            source: 'driveId'
        }).then(function (catalog) {
            if (!catalog || !_.has(catalog, 'data[0]')) {
                return Promise.reject(
                    new Error('Could not find driveId catalog data.'));
            }

            return catalog.data;
        }).filter(function (driveId) {
            if (_.isEmpty(filter)) {
                return true;
            }

            return driveId.identifier in filter || driveId.devName in filter;
        }).tap(function (driveIds) {
            var foundVdHasValue = _.find(driveIds, function (driveId) {
                return !_.isEmpty(driveId.virtualDisk);
            });

            if (!foundVdHasValue) {
                return;
            }
            // get virtualDisk data from megaraid-virtual-disks catalog
            return waterline.catalogs.findMostRecent({
                node: nodeId,
                source: 'megaraid-virtual-disks'
            }).then(function (virtualDiskCatalog) {
                if (!_.has(virtualDiskCatalog, 'data.Controllers[0]')) {
                    return Promise.reject(
                        new Error('Could not find megaraid-virtual-disks catalog data.'));
                }

                virtualDiskData = virtualDiskCatalog.data;
                return virtualDiskData.Controllers;
            }).tap(function () {
                // find controller data from megaraid-controllers catalog
                return waterline.catalogs.findMostRecent({
                    node: nodeId,
                    source: 'megaraid-controllers'
                }).then(function (controllerCatalog) {
                    controllerData = _.get(controllerCatalog, 'data');
                });
            }).each(function (vdDataPerController, index) {
                vdDataPerController.oemId = _.get(controllerData,
                    'Controllers[%d][Response Data][Scheduled Tasks].OEMID'.format(index));
            });
        })
        .map(function (driveId) {
            if (_.isEmpty(driveId.virtualDisk)) {
                return driveId;
            }

            var match = driveId.virtualDisk.match(/^\/c(\d+)\/v(\d+)/);
            if (!match) {
                return driveId;
            }

            var vid = match[2];
            var cid = match[1];
            var vdInfo;
            _.forEach(virtualDiskData.Controllers, function(controller) {
                var vd = _.get(controller,
                    'Response Data[%s]'.format(driveId.virtualDisk));

                if (vd) {
                    vdInfo = vd[0];
                    vdInfo.oemId = controller.oemId;
                    vdInfo.pdList = _.get(controller,
                        'Response Data[PDs for VD %d]'.format(vid)
                    );
                    return false; // break forEach
                }
            });

            if(!vdInfo) {
                // clear virtualDisk if no matched info found in catalog
                driveId.virtualDisk = '';
                return driveId;
            }
            // set extended info to driveId catalog
            driveId.size = vdInfo.Size;
            driveId.type = vdInfo.TYPE;
            driveId.controllerId = cid;
            driveId.physicalDisks = _.map(vdInfo.pdList, function (pd) {
                // for more physical disk info, search megaraid-physical-drives
                var eidslt = pd['EID:Slt'].split(':');
                return {
                    deviceId : pd.DID,
                    enclosureId : eidslt[0],
                    slotId : eidslt[1],
                    size: pd.Size,
                    protocol: pd.Intf,
                    type: pd.Med,
                    model: pd.Model
                };
            });
            driveId.deviceIds = _.map(driveId.physicalDisks, function (disk) {
                return disk.deviceId;
            });
            driveId.slotIds = _.map(driveId.physicalDisks, function (disk) {
                // slotId : /c0/e252/s10
                return '/c%d/e%d/s%d'.format(cid, disk.enclosureId, disk.slotId);
            });
            // OEM id is Dell or LSI
            if (vdInfo.oemId) {
                driveId.controllerVender = vdInfo.oemId.toLowerCase();
            }

            return driveId;
        });
    }

    return {
        getPath: getPath,
        findDriveWwidByIndex: findDriveWwidByIndex,
        getDriveIdCatalogExt: getDriveIdCatalogExt
    };
}
