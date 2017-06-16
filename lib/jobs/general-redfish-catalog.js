
// Copyright 2016, EMC, Inc.

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
        if(_.isEmpty(this.chassis)) {
            this.chassis = [ this.context.target ]
        }
        this.redfish = new RedfishTool();
    }

    util.inherits(GeneralRedfishCatalogJob, BaseJob);

    /**
     * @memberOf GeneralRedfishCatalogJob
     */
    GeneralRedfishCatalogJob.prototype._run = function() {
        var self = this; 
        return Promise.resolve(self.chassis)
            .each(self.driveEndpoints.bind(self))
            .each(self.catalogEndpoints.bind(self))
            .then(function() {
                self._done();
            })
            .catch(function(err) {
                self._done(err);
            });
    };

    GeneralRedfishCatalogJob.prototype.catalogEndpoints = Promise.method(function(nodeId) {
        var self = this;
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
                                    return waterline.catalogs.create({
                                        node: nodeId,
                                        source: 'Redfish',
                                        data: data.body
                                    }).then(function () {
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
        var catalogData = [];
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
                                    return waterline.catalogs.create({
                                        node: nodeId,
                                        source: 'Redfish',
                                        data: data.body
                                    }).then(function () {
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
