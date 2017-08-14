// Copyright 2015, EMC, Inc.

'use strict';

var di = require('di');

module.exports = searchCatalogDataFactory;
di.annotate(searchCatalogDataFactory, new di.Provide('JobUtils.CatalogSearchHelpers'));
di.annotate(searchCatalogDataFactory, new di.Inject(
    'Assert',
    '_',
    'Services.Waterline',
    'Promise'
));

function searchCatalogDataFactory(
    assert,
    _,
    waterline,
    Promise
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
     * Get driveId catalog data
     * @param {String} nodeId - node identifier
     * @param {Object} filter - [optional] The filter which contains the driveId catalogs identifier
     *                          Or devName. For example: ['sda', 'sdb', '1'].
     *                          driveId catalogs in filter will return, otherwise skip.
     * @return {Promise} driveId catalogs
     */
    function getDriveIdCatalog(nodeId, filter) {
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
            return _.indexOf(filter, driveId.identifier) > -1 ||
                _.indexOf(filter, driveId.devName) > -1;
        });
    }

    /**
     * Get virtual disk catalog data
     * @param {String} nodeId - node identifier
     * @return {Promise} drive virtual disk catalogs
     */
    function getVirtualDiskCatalog(nodeId){
        return waterline.catalogs.findMostRecent({
            node: nodeId,
            source: 'megaraid-virtual-disks'
        })
        .then(function (virtualDiskCatalog) {
            if (!_.has(virtualDiskCatalog, 'data.Controllers[0]')) {
                return Promise.reject(
                    new Error('Could not find megaraid-virtual-disks catalog data.'));
            }
            return virtualDiskCatalog.data;
        });
    }

    /**
     * Get physical disk catalog data
     * @param {String} nodeId - node identifier
     * @return {Promise} drive physical disk catalogs
     */
    function getPhysicalDiskCatalog(nodeId){
        return waterline.catalogs.findMostRecent({
            node: nodeId,
            source: 'megaraid-physical-drives'
        })
        .then(function(physicalDiskCatalog){
            if (!_.has(physicalDiskCatalog, 'data')) {
                return Promise.reject(
                    new Error('Could not find megaraid-physical-drives catalog data.'));
            }
            return physicalDiskCatalog.data;
        });
    }

    /**
     * Get drive RAID controller vendor from catalog 
     * @param {String} nodeId - node identifier
     * @return {Promise} drive RAID controller vendors
     */
    function getRaidControllerVendor(nodeId){
        return waterline.catalogs.findMostRecent({
            node: nodeId,
            source: 'megaraid-controllers'
        })
        .then(function (controllerCatalog) {
            if (!_.has(controllerCatalog, 'data.Controllers')) {
                return Promise.reject(
                    new Error('Could not find megaraid-controllers catalog data.'));
            }
            var vendor,
                controllerId,
                controllerVendors = [];
            var controllerDataList = _.get(controllerCatalog, 'data.Controllers');
            _.forEach(controllerDataList, function(data){
                vendor = _.get(data, '[Response Data][Scheduled Tasks].OEMID');
                controllerId = _.get(data, '[Command Status][Controller]');
                controllerVendors[controllerId] = vendor.toLowerCase();
            });
            return controllerVendors;
        });
    }

    /**
     * Get extended driveId catalog
     * @param {String} nodeId - node identifier
     * @param {Object} driveIds - driveId list retrieved from driveId catalogs
     * @param {Boolean} extendJbod - flag for if we should extend JBOD physical information
     * @return {Promise} Drive catalogs extended with Megaraid information
     */
    function getDriveIdCatalogExt(nodeId, filter, extendJbod) {
        return getDriveIdCatalog(nodeId, filter)
        .then(function (driveIds) {
            // get virtualDisk data from megaraid-virtual-disks catalog
            var foundVdHasValue = _.find(driveIds, function (driveId) {
                return !_.isEmpty(driveId.virtualDisk);
            });

            if (!foundVdHasValue && !extendJbod) {
                // If none of drives are VDs, and extend JBOD is not required,
                // it is not necessary to extend Megaraid information.
                return Promise.resolve(driveIds);
            }

            return Promise.all([
                foundVdHasValue ? getVirtualDiskCatalog(nodeId) : Promise.resolve(),
                extendJbod ? getPhysicalDiskCatalog(nodeId) : Promise.resolve(),
                getRaidControllerVendor(nodeId)
            ])
            .spread(function(virtualDiskData, physicalDiskData, controllerVendors){
                return Promise.map(driveIds, function(driveId){
                    if (!_.isEmpty(driveId.virtualDisk)) {
                        return _getVdExtDriveIdCatalog(
                            nodeId,
                            driveId,
                            virtualDiskData,
                            controllerVendors
                        );
                    }
                    if (extendJbod){
                        return _getJbodExtDriveIdCatalog(
                            nodeId,
                            driveId,
                            physicalDiskData,
                            controllerVendors
                        );
                    }
                    return driveId;
                });
            });
        });
    }

    /**
     * Get extended driveId catalog data for disk from virtualDiskData
     * @param {String} nodeId - node identifier
     * @param {Object} driveId - driveId catalog
     * @param {Object} virtualDiskData - Megaraid virtual disk catalogs
     * @param {Array} vendors - Drive vendor controller list 
     * @return {Promise} driveId catalogs extended
     */
    function _getVdExtDriveIdCatalog(nodeId, driveId, virtualDiskData, vendors){
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
        driveId.controllerVendor = vendors[_.parseInt(cid)];

        return driveId;
    }

    /**
     * Get extended driveId catalog data for JBOD disk from megaraid-physical-drives
     * @param {String} nodeId - node identifier
     * @param {Object} driveId - driveId catalog
     * @param {Object} physicalDiskData - Megaraid physical disk catalogs
     * @param {Array} vendors - Drive vendor controller list
     * @return {Promise} driveId catalogs extended
     */
    function _getJbodExtDriveIdCatalog(nodeId, driveId, physicalDiskData, vendors){
        //Devide ID in SCSI ID is used to match megaraid DID
        //This feature is only qualified on servers with one RAID card
        //An alternative method is to use logic wwid
        //to find "OS Device Name" in smart catalog and get megaraid DID
        var scsiIds = driveId.scsiId.split(':');
        var deviceId = scsiIds[2];
        var controllerId = scsiIds[0];
        /**
        *physicalDiskCatalog.data example, not fully displayed:
        *    "Controllers": [
        *    {
        *        "Command Status": {
        *            "Controller": 0,
        *            "Description": "Show Drive Information Succeeded.",
        *            "Status": "Success"
        *        },
        *        "Response Data": {
        *            "Drive /c0/e252/s0": [
        *                {
        *                    "DG": 0,
        *                    "DID": 0,
        *                    "EID:Slt": "252:0",
        *                    "Intf": "SAS",
        *                    "Med": "HDD",
        *                    "Model": "ST1200MM0088    ",
        *                    "PI": "N",
        *                    "SED": "N",
        *                    "SeSz": "512B",
        *                    "Size": "1.091 TB",
        *                    "Sp": "U",
        *                    "State": "Onln"
        *                }
        */
        var driveDataList,
            driveBaseInfoList = {},
            matchedBaseInfo,
            matchedBaseInfoKey;

        _.forEach(physicalDiskData.Controllers, function(controller){
            if (controller['Command Status'].Controller.toString() === controllerId) {
                driveDataList = controller['Response Data'];
                return false;
            }
        });

        //Filter Drive Basic information from Response Data
        //Drive Basic information is the only one has array as element
        _.forEach(driveDataList, function(driveInfo, key){
            if(_.isArray(driveInfo)) {
                driveBaseInfoList[key] = driveInfo[0];
            }
        });

        _.forEach(driveBaseInfoList, function(info, key){
            if(info.DID.toString() === deviceId){
                matchedBaseInfoKey = key;
                return false;
            }
        });

        if (matchedBaseInfoKey ) {
            // Base info key example:
            //  "Drive /c0/e252/s0"
            var match = matchedBaseInfoKey.match(/.*\/c(\d+)\/e(\d+)\/s(\d+)/);
            matchedBaseInfo = driveBaseInfoList[matchedBaseInfoKey];
            driveId.controllerId = controllerId; 
            driveId.deviceIds = [matchedBaseInfo.DID];
            driveId.slotIds = matchedBaseInfoKey.split(' ').slice(-1);
            driveId.size = matchedBaseInfo.Size;
            driveId.type = matchedBaseInfo.State;
            driveId.controllerVendor = vendors[_.parseInt(controllerId)];
            driveId.physicalDisks = [{
                protocol: matchedBaseInfo.Intf,
                model: matchedBaseInfo.Model,
                deviceId: matchedBaseInfo.DID,
                slotId: match[3],
                size: matchedBaseInfo.Size,
                type: matchedBaseInfo.Med,
                enclosureId: match[2]
            }];
        }
        return driveId;
    }

    return {
        getPath: getPath,
        findDriveWwidByIndex: findDriveWwidByIndex,
        getDriveIdCatalog: getDriveIdCatalog,
        getDriveIdCatalogExt: getDriveIdCatalogExt
    };
}
