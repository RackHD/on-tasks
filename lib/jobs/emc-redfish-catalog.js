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
        assert.string(this.context.target);
        this.nodeId = this.context.target;
        this.redfish = new RedfishTool();
        this.redfish.setup(this.nodeId);
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
        var self = this;
        var rootPath = self.redfish.settings.root;
        
        return self.redfish.clientRequest(rootPath)
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
        .then(function(data) {
            assert.ok(Array.isArray(data), 'Element Data');
            return waterline.catalogs.create({
                node: self.nodeId,
                source: 'Elements',
                data: data
            });
        });
    };
    
    return EmcRedfishCatalogJob;
}
