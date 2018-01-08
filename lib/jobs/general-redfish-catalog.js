//Copyright 2017, Dell EMC, Inc.
'use strict';

var di = require('di');
module.exports = GeneralRedfishCatalogJobFactory;
di.annotate(GeneralRedfishCatalogJobFactory, new di.Provide('Job.General.Redfish.Catalog'));
di.annotate(GeneralRedfishCatalogJobFactory, new di.Inject(
    'Job.Base',
    'Logger',
    'Promise',
    'Assert',
    'Util',
    'Services.Waterline',
    'Services.Encryption',
    '_',
    'JobUtils.RedfishTool'
));

function GeneralRedfishCatalogJobFactory(
    BaseJob,
    Logger,
    Promise,
    assert,
    util,
    waterline,
    encryption,
    _,
    RedfishTool
) {
    var logger = Logger.initialize(GeneralRedfishCatalogJobFactory);


    /**
     * @param {Object} options task options object
     * @param {Object} context graph context object
     * @param {String} taskId running task identifier
     * @constructor
     */
    function GeneralRedfishCatalogJob(options, context, taskId) {
        GeneralRedfishCatalogJob.super_.call(this,
            logger,
            options,
            context,
            taskId);
        this.chassis = this.context.chassis || [];
        this.systems = this.context.systems || [];
        this.cooling = this.context.cooling || [];
        this.power = this.context.power || [];
        this.networks = this.context.networks || [];
        this.allEndpoints = _.union(this.systems, this.power, this.cooling, this.networks, this.chassis);
        this.redfish = new RedfishTool();

        // TODO Manual Redfish discovery will return an array of nodes.

    }

    util.inherits(GeneralRedfishCatalogJob, BaseJob);

    /**
     * @memberOf GeneralRedfishCatalogJob
     */
    GeneralRedfishCatalogJob.prototype._run = function() {
        var self = this;
        return self.getAllCatalogs(self.allEndpoints)
            .then(function() {
                return;
            })
            .then(function () {
                self._done();
            })
            .catch(function (err) {
                self._done(err);
            });
    };


    GeneralRedfishCatalogJob.prototype.replacer = function(nodeId, odataId, res) {
        var self = this;

        var catalogString = JSON.stringify(res.body);
        var odataIdString = odataId;
        var catalogNodeId = nodeId;

        var idTable = {
            'systems': {},
            'chassis': {},
            'manager': {},
            'default': {}
        };

        return waterline.nodes.getNodeById(nodeId)
        .then(function(node) {
            var managerNodeId = node.relations[_.findIndex(node.relations, {'relationType': 'managedBy'})].targets[0];
            return [node, waterline.nodes.getNodeById(managerNodeId)];
        })
        .spread(function(node, managerNode) {

            var index;
            var filter;
            var re;
            var replace_str;

            idTable.default.id  = node.id;

            var replaceFilter = [
                {id: "systems", pattern: "Systems/"  , prefix: "Systems/", postfix: ""},
                {id: "chassis", pattern: "Chassis/" , prefix: "Chassis/", postfix: ""},
                {id: "manager", pattern: "Managers/" , prefix: "Managers/", postfix: ""},
                {id: "manager", pattern: "" , prefix: "", postfix: ""}
            ];

            switch(node.type)  {
                case "redfish":
                    idTable.systems.id  = node.id;
                    idTable.systems.find  = node.identifiers[0];
                    idTable.systems.replaceWith  = node.identifiers[2];
                    idTable.chassis.id  = node.id;
                    idTable.chassis.find  = node.identifiers[0];
                    idTable.chassis.replaceWith  = node.identifiers[2];
                    idTable.manager.id  = managerNode.id;
                    idTable.manager.find  = managerNode.identifiers[0];
                    idTable.manager.replaceWith = managerNode.id;
                    break;

                default:
                    logger.info("Node type: " + node.type);
                    return;
            }

            if (idTable['system'] !== 'undefined' && idTable['chassis'] !== 'undefined') {
                for (index = 0; index < replaceFilter.length; index += 1) {
                    filter = replaceFilter[index];
                    re = new RegExp(filter.pattern + idTable[filter.id].find, 'gi');
                    replace_str = filter.prefix + idTable[filter.id].replaceWith + filter.postfix;
                    catalogString =  catalogString.replace(re, replace_str);
                }

                for (index = 0; index < replaceFilter.length; index += 1) {
                    filter = replaceFilter[index];
                    re = new RegExp(filter.pattern + idTable[filter.id].find, 'i');
                    replace_str = filter.prefix + idTable[filter.id].id + filter.postfix;

                    if (odataIdString.match(re) !== null) {
                        odataIdString = odataIdString.replace(re, replace_str);
                        catalogNodeId = idTable[filter.id].id;
                        break;
                    }
                }
            }
        })
        .then(function() {
            var dataToSave = {
                node: catalogNodeId,
                source: odataIdString,
                data: JSON.parse(catalogString)
            };

            var query = {
                node: catalogNodeId,
                source: odataIdString
            };
            return waterline.catalogs.count(query)
            .then(function(count) {
                if (count) {
                    return waterline.catalogs.update(query, dataToSave);
                } else {
                    return waterline.catalogs.create(dataToSave);
                }
            });
        })
        .catch(function (err) {
            logger.info(JSON.stringify(err, null,4));
            self._done(err);
        });
    };

    GeneralRedfishCatalogJob.prototype.createRedfishCatalogs = function (redfishObject, nodeId, processedOdataIds) {
        var self = this;
        var catalogString = JSON.stringify(redfishObject);
        var odataIds = catalogString.match(/"@odata.id":".*?"/g);

        return Promise.each(odataIds, function(item) {
            var odataIdArray = item.split(':');
            var odataId = odataIdArray[1].replace(/"/g, '');
            if (odataId in processedOdataIds) {
                return;
            }

            processedOdataIds[odataId] = odataId;
            return self.redfish.clientRequest(odataId)
            .then(function (res) {
                return self.replacer(nodeId, odataId, res)
                .then(function() {
                    return Promise.resolve(self.createRedfishCatalogs(res.body, nodeId, processedOdataIds))
                    .then(function() {
                        return nodeId;
                    });
                })
                .catch(function(err){
                    logger.error(JSON.stringify(err, null, 4));
                    logger.error('could not access: ' + odataId);
                });
            })
            .catch(function(err){
                    logger.error(JSON.stringify(err, null, 4));
            });
        });
    };

    GeneralRedfishCatalogJob.prototype.getSystemsCatalogs = function (system) {
        var self = this;
        return Promise.resolve(system)
            .each(self.catalogSystem.bind(self));
    };

    GeneralRedfishCatalogJob.prototype.getAllCatalogs = function (allEndpoints) {
        var self = this;

        return Promise.resolve(allEndpoints)
            .each(self.catalogAll.bind(self));
    };

    GeneralRedfishCatalogJob.prototype.catalogAll = Promise.method(function (nodeId) {
        var self = this;
        if (nodeId === undefined)
        {
            return;
        }

        return self.redfish.setup(nodeId)
            .then(function () {
                return self.redfish.clientRequest(self.redfish.settings.root);
            })
            .then(function (res) {
                return self.replacer(nodeId, res.body['@odata.id'], res)
                .then(function () {
                    // Create all catalogs
                    var processedOdataIds = {};
                    processedOdataIds[self.redfish.settings.root] = self.redfish.settings.root;
                    return Promise.resolve(self.createRedfishCatalogs(res.body, nodeId, processedOdataIds))
                    .then( function() {
                        return nodeId;
                    });
                });
            })
            .catch(function (err) {
                logger.error('catalogAll', {
                    error: err
                });
                if (err.message !== 'Missing Resource' &&
                    err.message !== 'No Members') {
                    throw err;
                }
                return nodeId;
            });
    });

    GeneralRedfishCatalogJob.prototype.catalogSystem = Promise.method(function (nodeId) {
        var self = this;
        if (nodeId === undefined)
        {
            return;
        }
        return self.redfish.setup(nodeId)
            .then(function () {
                var beforeSettings = self.redfish.settings.root;
                var redfishSettings = beforeSettings.replace('Chassis', 'Systems');
                return self.redfish.clientRequest(redfishSettings);
            })
            .then(function (res) {
                return self.replacer(nodeId, res.body['@odata.id'], res)
                .then(function () {
                    // Create all catalogs
                    var processedOdataIds = {};
                    processedOdataIds[self.redfish.settings.root] = self.redfish.settings.root;
                    return self.createRedfishCatalogs(res.body, nodeId, processedOdataIds);
                });
            })
            .then( function() {
                return nodeId;
            })
            .catch(function (err) {
                logger.error('catalogSystem', {
                    error: err
                });
                if (err.message !== 'Missing System Resource' &&
                    err.message !== 'No System Members') {
                    throw err;
                }
                return nodeId;
            });
    });

    GeneralRedfishCatalogJob.prototype.catalogEndpoints = Promise.method(function(nodeId) {
        var self = this;
        if (nodeId === undefined)
        {
            return;
        }
        return self.redfish.setup(nodeId)
            .then(function() {
                return self.redfish.clientRequest(self.redfish.settings.root);
            })
            .then(function (res) {
                return Promise.all([_.get(res.body, 'Links.CooledBy', []), _.get(res.body, 'Links.PoweredBy', [])])
                    .spread(function (fanLinks, powerLinks) {
                        var endPoints = _.union(fanLinks, powerLinks);
                        return Promise.each(endPoints, function (Element) {
                            var pre_path = _.get(Element, '@odata.id', {});
                            var path = pre_path.replace(/(\||,)/g, '%7C');
                            return self.redfish.clientRequest(path)
                                .then(function (data) {

                                    return self.replacer(nodeId, data.body['@odata.id'], data)
                                    .then(function () {
                                        return nodeId;
                                    });
                                })
                                .catch(function (err) {
                                    logger.error('Redfish Enpoint', {
                                        error: err
                                    });
                                    if (err.message !== 'Missing Power Supply or Fan Endpoint' &&
                                        err.message !== 'No PowerSupply or Fan Endpoints') {
                                        throw err;
                                    }
                                    return nodeId;
                                });
                        });
                    });
            })
            .catch(function(err){
                logger.error('catalogEndpoints', {
                    error: err
                });
                if(err.message !== 'Missing catalogEndpoints Resource' &&
                    err.message !== 'No CooledBy/PoweredBy Members') {
                    throw err;
                }
                return nodeId;
            });
    });

    GeneralRedfishCatalogJob.prototype.driveEndpoints = Promise.method(function(nodeId) {
        var self = this;
        return self.redfish.setup(nodeId)
            .then(function() {
                var beforeSettings = self.redfish.settings.root;
                var redfishSettings = beforeSettings.replace('Chassis', 'Systems');
                return self.redfish.clientRequest(redfishSettings);
            })
            .then(function (res) {
                return self.redfish.clientRequest(_.get(res.body, 'SimpleStorage', {})['@odata.id'])
                    .then(function (drive) {
                        return Promise.each(drive.body.Members, function (driveElem) {
                            return self.redfish.clientRequest(driveElem['@odata.id'])
                                .then(function (data) {
                                    return self.replacer(nodeId, data.body['@odata.id'], data)
                                    .then(function () {
                                        return nodeId;
                                    });
                                })
                                .catch(function (err) {
                                    logger.error('Drives', {
                                        error: err
                                    });
                                    if (err.message !== 'Missing Drives Resource' &&
                                        err.message !== 'No Drives Endpoints') {
                                        throw err;
                                    }
                                    return nodeId;
                                });
                        });
                    });
            })
            .catch(function(err){
                logger.error('driveEndpoints', {
                    error: err
                });
                if(err.message !== 'Missing driveEndpoints Resource' &&
                    err.message !== 'No driveEndpoints Members') {
                    throw err;
                }
                return nodeId;
            });


    });

    return GeneralRedfishCatalogJob;
}
