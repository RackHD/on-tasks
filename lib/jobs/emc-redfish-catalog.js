
// Copyright 2016, EMC, Inc.

'use strict';

var di = require('di');
module.exports = EmcRedfishCatalogJobFactory;
di.annotate(EmcRedfishCatalogJobFactory, new di.Provide('Job.Emc.Redfish.Catalog'));
di.annotate(EmcRedfishCatalogJobFactory, new di.Inject(
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

function EmcRedfishCatalogJobFactory(
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
    var logger = Logger.initialize(EmcRedfishCatalogJobFactory);
    

    /**
     * @param {Object} options task options object
     * @param {Object} context graph context object
     * @param {String} taskId running task identifier
     * @constructor
     */
    function EmcRedfishCatalogJob(options, context, taskId) {
        EmcRedfishCatalogJob.super_.call(this,
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

    util.inherits(EmcRedfishCatalogJob, BaseJob);

    /**
     * @memberOf EmcRedfishCatalogJob
     */
    EmcRedfishCatalogJob.prototype._run = function() {
        var self = this;
        return Promise.resolve(self.chassis)
        .each(self.catalogElements.bind(self))
        .each(self.catalogHbas.bind(self))
        .each(self.catalogAggregators.bind(self))
        .each(self.catalogSpine.bind(self))
        .then(function() {
            self._done();
        })
        .catch(function(err) {
            self._done(err);
        });
    };
    
    EmcRedfishCatalogJob.prototype.catalogSpine = Promise.method(function(nodeId) {
        var self = this;
        var catalogData = [];
        return self.redfish.setup(nodeId)
        .then(function() {
            return self.redfish.clientRequest(self.redfish.settings.root);
        })
        .then(function(res) {
            assert.object(res, 'Chassis Resource Object');
            var spineModId = _.get(res.body, 'Oem.Emc.SpineModules', {})['@odata.id'];
            if (_.isUndefined(spineModId)) {
                throw new Error('Missing SpineModules Resource');
            }
            return self.redfish.clientRequest(spineModId)
            .then(function(res) {
                var members = _.get(res, 'body.Members', {});
                assert.ok(Array.isArray(members), 'SpineModules Member List');
                return members;
            });
        })
        .map(function(member) {
            return self.redfish.clientRequest(member['@odata.id']);
        })
        .map(function(res) {
            assert.object(res.body, 'SpineModule Data');
            var data = {
                Id: res.body.Id,
                Name: res.body.Name,
                Type: res.body.Type,
                Manufacturer: res.body.Manufacturer,
                Model: res.body.Model,
                PartNumber: res.body.PartNumber,
                SerialNumber: res.body.SerialNumber,
                Controllers: [],
                Switches: [],
                Vpd: {}
            };
            return Promise.each([
                self.redfish.clientRequest(_.get(res.body, 'Controllers', {})['@odata.id']),
                self.redfish.clientRequest(_.get(res.body, 'Switches', {})['@odata.id'])
            ], function(resList) {
                return Promise.map(_.get(resList.body, 'Members', []), function(member) {
                    var id = member['@odata.id'];
                    return self.redfish.clientRequest(id)
                    .then(function(res) {
                        data[id.match(/Controllers/g) ? 'Controllers' : 'Switches'].push(res.body);
                    });
                });
            })
            .then(function() {
                return self.redfish.clientRequest(_.get(res.body, 'Vpd', {})['@odata.id'])
                .then(function(res) {
                    data['Vpd'] = res.body;
                    catalogData.push(data);
                });
            });
        })
        .then(function() {
            return waterline.catalogs.create({
                node: nodeId,
                source: 'SpineModules',
                data: _.flattenDeep(catalogData)
            }).then(function() {
                return nodeId;
            });
        })
        .catch(function(err) {
            logger.error('SpineModules', {
                error: err
            });
            if (err.message !== 'Missing SpineModules Resource') {
                throw err;
            }
            return nodeId;
        });
    });
    
    EmcRedfishCatalogJob.prototype.catalogHbas = Promise.method(function(nodeId) {
        var self = this;
        var catalogData = [];
        return self.redfish.setup(nodeId)
        .then(function() {
            return self.redfish.clientRequest(self.redfish.settings.root);
        })
        .then(function(res) {
            assert.object(res, 'Chassis Resource Object');
            var hbaId = _.get(res.body, 'Oem.Emc.Hbas', {})['@odata.id'];
            if(_.isUndefined(hbaId)) {
                throw new Error('Missing HBA Resource');
            }
            return self.redfish.clientRequest(hbaId);
        })
        .then(function(res) {
            var members = _.get(res, 'body.Members', {});
            assert.ok(Array.isArray(members), 'HBA Member List');
            return members;
        })
        .map(function(member) {
            return self.redfish.clientRequest(member['@odata.id']);
        })
        .map(function(res) {
            assert.object(res.body, 'HBA Data');
            var ctrlId = _.get(res.body, 'Controllers', {})['@odata.id'];
            var data = {
                Id: res.body.Id,
                Name: res.body.Name,
                Manufacturer: res.body.Manufacturer,
                Model: res.body.Model,
                PartNumber: res.body.PartNumber,
                SerialNumber: res.body.SerialNumber,
                Controllers: []
            };
            return self.redfish.clientRequest(ctrlId).then(function(ctrlRes) {
                var members = _.get(ctrlRes.body, 'Members', []);
                return Promise.each(members, function(member) {
                    return self.redfish.clientRequest(member['@odata.id'])
                    .then(function(hbaRes) {
                        data.Controllers.push(hbaRes.body);
                        catalogData.push(data);
                    });
                });
            });
        })
        .then(function() {
            return waterline.catalogs.create({
                node: nodeId,
                source: 'Hbas',
                data: _.flattenDeep(catalogData)
            }).then(function() {
                return nodeId;
            });            
        })
        .catch(function(err) {
            logger.error('HBA', { error:err });
            if(err.message === 'Missing HBA Resource') {
                return nodeId; // allow
            }
            throw err;
        });
    });

    EmcRedfishCatalogJob.prototype.catalogAggregators = Promise.method(function(nodeId) {
        var self = this;
        var catalogData = [];
        return self.redfish.setup(nodeId)
        .then(function() {
            return self.redfish.clientRequest(self.redfish.settings.root);
        })
        .then(function(res) {
            assert.object(res, 'Chassis Resource Object');
            var aggrId = _.get(res.body, 'Oem.Emc.Aggregators', {})['@odata.id'];
            if(_.isUndefined(aggrId)) {
                throw new Error('Missing Aggregators Resource');
            }
            return self.redfish.clientRequest(aggrId);
        })
        .then(function(res) {
            var members = _.get(res, 'body.Members', {});
            assert.ok(Array.isArray(members), 'Aggregators Members');
            return members;
        })
        .map(function(member) {
            return self.redfish.clientRequest(member['@odata.id']);
        })
        .map(function(res) {
            assert.object(res.body, 'Aggregators Data');
            var data = {
                Id: res.body.Id,
                Name: res.body.Name,
                Type: res.body.Type,
                Manufacturer: res.body.Manufacturer,
                Model: res.body.Model,
                PartNumber: res.body.PartNumber,
                SerialNumber: res.body.SerialNumber,
                Controllers: [],
                Switches: []
            };         
            return Promise.each([
                self.redfish.clientRequest(_.get(res.body, 'Controllers', {})['@odata.id']),
                self.redfish.clientRequest(_.get(res.body, 'Switches', {})['@odata.id'])
            ], function(aggRes) {   
                return Promise.map(_.get(aggRes.body, 'Members', []), function(member) {
                    var id = member['@odata.id']; 
                    return self.redfish.clientRequest(id)
                    .then(function(res) {
                        data[(id.match(/Controllers/g))?'Controllers':'Switches'].push(res.body);
                        catalogData.push(data);
                    });
                });
            });
        })
        .then(function() {
            return waterline.catalogs.create({
                node: nodeId,
                source: 'Aggregators',
                data: _.flattenDeep(catalogData)
            }).then(function() {
                return nodeId;
            });            
        })
        .catch(function(err) {
            logger.error('Aggregators', { error:err });
            if(err.message === 'Missing Aggregators Resource') {
                return nodeId; // allow
            }
            throw err;
        });
    });

    /**
     * @memberOf EmcRedfishCatalogJob
     */
    EmcRedfishCatalogJob.prototype.catalogElements = Promise.method(function(nodeId) {
        var self = this;
        return self.redfish.setup(nodeId)
        .then(function() {
            return self.redfish.clientRequest(self.redfish.settings.root);
        })
        .then(function(res) {
            assert.object(res, 'Chassis Resource Object');
            var elements = _.get(res.body, 'Oem.Emc.Elements');
            if (!elements) {
                throw new Error('Missing Emc Element Data');
            }
            return elements['@odata.id'];
        })
        .then(function(id) {
            assert.string(id, 'Element Identifier');
            return self.redfish.clientRequest(id);
        })
        .then(function(res) {
            assert.object(res, 'Element Resource Object');
            var elements = _.get(res, 'body.Members');
            return elements;
        })
        .map(function(element) {
            return self.redfish.clientRequest(element['@odata.id']);
        })
        .map(function(element) {
            assert.object(element, 'Element Resource Object');
            assert.object(element.body);
            return element.body;
        })
        .map(function(element) {
            return self.redfish.clientRequest(element['@odata.id'])
                .then (function(element){
                    return element;
                });
        })
        .map(function(element) {
            assert.object(element, 'Element Resource Object');
            assert.object(element.body);
            return element.body;
        })
        .map(function(element){
            var newElement = {};
            _.forEach(element,function(value,key){
                if(key === "Processors" || key === "Vpd" || key === "Dimms" || key === "Drives") {
                    if(value instanceof Array){
                        newElement [key]=   self.updatingComponentsArray(element,key);
                    }
                    else {
                        newElement [key]=   self.updatingComponents(element,key);
                    }
                }
                else {
                    newElement[key] = element[key];
                }
            });
            return Promise.props(newElement);
        })
        .then(function(data) {
            assert.ok(Array.isArray(data), 'Element Data');
            return waterline.catalogs.create({
                node: nodeId,
                source: 'Elements',
                data: data
            }).then(function() {
                return nodeId;
            });
        });
    });

    EmcRedfishCatalogJob.prototype.updatingComponents = function (element, property) {
        var self = this;
        return self.redfish.clientRequest(element[property]['@odata.id'])
            .then (function(data){
                return data.body;
            })
            .then (function(element){
                if (element.hasOwnProperty("Members")){
                    var subElement = _(element.Members).map(function(arr){
                        return self.redfish.clientRequest(arr['@odata.id'])
                            .then(function(res){
                                return res.body;
                            });
                    }).value();
                    return Promise.all(subElement)
                }
                else {
                    return element;
                }
            });
    };

    EmcRedfishCatalogJob.prototype.updatingComponentsArray = function (element, property) {
        var self = this;
        var subElement = _(element[property]).map(function(arr){
            return self.redfish.clientRequest(arr['@odata.id'])
                .then(function(res){
                    return res.body;
                });
        }).value();
        return Promise.all(subElement)

    };
    return EmcRedfishCatalogJob;
}
