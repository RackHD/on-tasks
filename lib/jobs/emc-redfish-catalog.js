
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
        .then(function() {
            self._done();
        })
        .catch(function(err) {
            self._done(err);
        });
    };
    
    EmcRedfishCatalogJob.prototype.catalogHbas = Promise.method(function(nodeId) {
        var self = this;
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
            assert.object(res, 'HBA Member Object');
            var ctrlId = _.get(res.body, 'Controllers', {})['@odata.id'];
            return self.redfish.clientRequest(ctrlId);
        })
        .map(function(res) {
            var members = _.get(res, 'body.Members', []);
            return Promise.map(members, function(member) {
                return self.redfish.clientRequest(member['@odata.id'])
                .then(function(res) {
                    return res.body;
                });
            });
        })
        .then(function(data) {
            assert.ok(Array.isArray(data), 'HBA Data');
            return waterline.catalogs.create({
                node: nodeId,
                source: 'Hbas',
                data: _.flattenDeep(data)
            }).then(function() {
                return nodeId;
            });            
        });
    });

    EmcRedfishCatalogJob.prototype.catalogAggregators = Promise.method(function(nodeId) {
        var self = this;
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
            assert.ok(Array.isArray(members), 'Aggregators Member List');
            return members;
        })
        .map(function(member) {
            return self.redfish.clientRequest(member['@odata.id']);
        })
        .map(function(res) {
            assert.object(res, 'Aggregators Member Object');
            var ctrlId = _.get(res.body, 'Controllers', {})['@odata.id'];
            var swId = _.get(res.body, 'Switches', {})['@odata.id'];
            return Promise.all([
                self.redfish.clientRequest(ctrlId), 
                self.redfish.clientRequest(swId)
            ]);    
        })
        .map(function(resList) {
            var data = [];
            return Promise.each(resList, function(res) {
                var members = _.get(res, 'body.Members', []);        
                return Promise.map(members, function(member) {
                    return self.redfish.clientRequest(member['@odata.id'])
                    .then(function(res) {
                        data.push(res.body);
                    });
                });
            }).then(function() {
                return data;
            });
        })
        .then(function(data) {
            return waterline.catalogs.create({
                node: nodeId,
                source: 'Aggregators',
                data: _.flattenDeep(data)
            }).then(function() {
                return nodeId;
            });            
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
                    newElement [key]=   self.updatingComponents(element,key);
                } else {
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
    return EmcRedfishCatalogJob;
}
