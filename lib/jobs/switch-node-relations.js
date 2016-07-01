// Copyright 2016, EMC, Inc.

'use strict';

var di = require('di');

module.exports = switchRelationsJobFactory;
di.annotate(switchRelationsJobFactory, new di.Provide('Job.Catalog.SwitchRelations'));
di.annotate(switchRelationsJobFactory, new di.Inject(
    'Job.Base',
    'Services.Waterline',
    'JobUtils.CatalogSearchHelpers',
    'Logger',
    'Util',
    'Promise',
    'Assert',
    '_'
));

function switchRelationsJobFactory(
    BaseJob,
    waterline,
    catalogSearch,
    Logger,
    util,
    Promise,
    assert,
    _
) {

    var logger = Logger.initialize(switchRelationsJobFactory);

    /**
     *
     * @param {Object} [options]
     * @constructor
     */
    function SwitchRelationsJob(options, context, taskId) {
        SwitchRelationsJob.super_.call(this, logger, options, context, taskId);

        this.nodeId = context.target || options.nodeId;
        assert.isMongoId(this.nodeId);
    }

    util.inherits(SwitchRelationsJob, BaseJob);

    /**
     * Globals
     */

    var RELATION_TYPE = 'connectsTo';

    /**
     * @memberOf SwitchRelationsJob
     */
    SwitchRelationsJob.prototype._run = function run() {
        var self = this;
        var lldpList;
        return self._getMacAddressList()
        .then(function (macList) {
            lldpList = macList;
            return _getCatalogsBySource('lldp');
        })
        .each(function (lldpData) {
            return _findMatchingMac(lldpData, lldpList)
            .then(function (info) {
                if (Object.keys(info).length) {
                    return self._updateSwitchRelations(lldpData, info);
                }
            });
        })
        .then(function () {
            self._done();
        })
        .catch(function (err) {
            self._done(err);
        });

    };

    /**
     * search in snmp-1 catalog data for switch mac addresses
     * returns an array of switch mac addresses
     */
    SwitchRelationsJob.prototype._getMacAddressList = function getMacAddressList() {
        var self = this;
        var data;
        var macArr = [];
        return waterline.catalogs.findMostRecent({
            node: self.nodeId,
            source: 'snmp-1'
        })
        .then(function (catalog) {
            data = catalog.data;
            return Promise.resolve(Object.keys(catalog.data));
        })
        .filter(function (key) {
            return /ifPhysAddress_/.test(key);
        })
        .each(function (phys) {
            if (_validateMacStrFormat(data[phys])) {
                macArr.push(_adjustMacStrFormat(data[phys]));
            }
        })
        .then(function () {
            if (macArr.length === 0) {
                throw new Error('couldnt find ports mac addresses in catalog');
            }
            return Promise.resolve(macArr);
        });
    };

    /**
     * update an existing entry in nodes relations or
     * create one if it doesn't exist
     * return a promise
     */
    SwitchRelationsJob.prototype._updateSwitchRelations =
        function updateSwitchRelations(lldpData, info) {
            var self = this;
            return waterline.nodes.findByIdentifier(lldpData.node)
            .then(function (node) {
                if (!node) {
                    return Promise.reject('Could not find node with identifier ' + lldpData.node);
                }
                else {
                    return Promise.resolve(node.relations);
                }
            })
            .filter(function (entry) {
                return (entry.targets.indexOf(self.nodeId) < 0);
            })
            .then(function (relations) {
                relations.push({
                    relationType: RELATION_TYPE,
                    targets: [self.nodeId],
                    info: info
                });
                return waterline.nodes.updateByIdentifier(
                    lldpData.node,
                    { relations: relations });
            });

        };

    function _getCatalogsBySource(src) {
        return waterline.catalogs.find({
            source: src
        });
    }

    /**
     * Iterate through switch mac addresses list
     * for a match in nodes lldp catalog
     * return a promise
     */
    function _findMatchingMac(nodeLldpData, lldpMacList) {
        var relationsList = {};
        return Promise.all(
        _.forEach(_.keys(nodeLldpData.data), function (ethPort) {
            //validate mac first
            var lldpMac = catalogSearch.getPath(nodeLldpData.data[ethPort], 'chassis.mac');
            if (!lldpMac) {
                throw new Error('cant find mac address in lldp data for node ' +
                    nodeLldpData.node + ' port ' + ethPort);
            }
            if (_validateMacStrFormat(lldpMac)) {
                lldpMac = _adjustMacStrFormat(lldpMac);
                if (lldpMacList.indexOf(lldpMac) >= 0) {
                    var singleEntry = {
                        destMac: nodeLldpData.data[ethPort].chassis.mac,
                        destPort: nodeLldpData.data[ethPort].port.ifname
                    };
                    relationsList[ethPort] = singleEntry;
                }
            } else {
                throw new Error('mac: ' + lldpMac + ' bad format',
                    +nodeLldpData.node + ' port ' + ethPort);
            }
        }))
        .then(function () {
            return Promise.resolve(relationsList);
        });
    }

    /**
     * verify that mac address is 5 hex nbs separated by ':'
     * returns a booleen
     */
    function _validateMacStrFormat(macString) {
        var regex = /^(([A-Fa-f0-9]{1,2}[:]){5}[A-Fa-f0-9]{1,2}[,]?)+$/;
        return regex.test(macString);
    }

    /**
     * Adjust mac Address format to 2 hex digits
     * return mac address string
     */
    function _adjustMacStrFormat(macString) {
        macString = macString.toLowerCase();
        var mac = macString.split(':');
        macString = '';
        for (var i = 0; i < mac.length; i += 1) {
            if (mac[i].length === 1) {
                mac[i] = '0' + mac[i];
            }
            macString += mac[i];
        }
        return macString;
    }

    return SwitchRelationsJob;
}
