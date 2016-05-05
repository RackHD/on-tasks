
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
        this.chassis = this.context.chassis ||  [ this.context.target ] || [];
        this.systems = this.context.systems || [];
        this.redfish= new RedfishTool();
    }

    util.inherits(EmcRedfishCatalogJob, BaseJob);

    /**
     * @memberOf EmcRedfishCatalogJob
     */
    EmcRedfishCatalogJob.prototype._run = function() {
        var self = this;
        return self.catalogElements()
        .then(function() {
            self._done();
        })
        .catch(function(err) {
            self._done(err);
        });
    };

    /**
     * @memberOf EmcRedfishCatalogJob
     */
    EmcRedfishCatalogJob.prototype.catalogElements = function() {
        return Promise.map(this.chassis, this._catalogElements.bind(this));
    };

    /**
     * @memberOf EmcRedfishCatalogJob
     */
    EmcRedfishCatalogJob.prototype._catalogElements = function(nodeId) {
        var self =this;
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
            });
        });
    };

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
