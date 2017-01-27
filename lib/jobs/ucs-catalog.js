
// Copyright 2017, EMC, Inc.

'use strict';

var di = require('di');
module.exports = UcsCatalogJobFactory;
di.annotate(UcsCatalogJobFactory, new di.Provide('Job.Ucs.Catalog'));
di.annotate(UcsCatalogJobFactory, new di.Inject(
    'Job.Base',
    'Logger',
    'Promise',
    'Assert',
    'Util',
    'Services.Waterline',
    'Services.Encryption',
    '_',
    'JobUtils.UcsTool'
));

function UcsCatalogJobFactory(
    BaseJob,
    Logger,
    Promise,
    assert,
    util,
    waterline,
    encryption,
    _,
    UcsTool
) {
    var logger = Logger.initialize(UcsCatalogJobFactory);


    /**
     * @param {Object} options task options object
     * @param {Object} context graph context object
     * @param {String} taskId running task identifier
     * @constructor
     */
    function UcsCatalogJob(options, context, taskId) {
        UcsCatalogJob.super_.call(this,
            logger,
            options,
            context,
            taskId);
        this.node = this.context.target;
        this.ucs = new UcsTool();
    }

    util.inherits(UcsCatalogJob, BaseJob);

    /**
     * @memberOf UcsCatalogJob
     */
    UcsCatalogJob.prototype._run = function() {
        var self = this;
        return self.catalogRackmounts(this.node)
            .then(function() {
                self._done();
            })
            .catch(function(err) {
                self._done(err);
            });
    };


    /**
     * @function Catalog Rackmounts
     * @description Catalog all the rackmount servers in the Cisco UCS
     */
    UcsCatalogJob.prototype.catalogRackmounts = function (nodeId) {
        var self = this;

        return self.ucs.setup(nodeId)
            .then(function(){
                return waterline.nodes.getNodeById(nodeId);
            })
            .then(function(node){
                var username = self.ucs.settings.username;
                var password = self.ucs.settings.password;
                var ucs = self.ucs.settings.ucs;
                var baseurl= self.ucs.settings.protocol+"://"+self.ucs.settings.host+ ":"+self.ucs.settings.port;/* jshint ignore:line */
                var url= baseurl + "/catalog/?host=" + ucs+ "&user="+ username + "&password=" + password + "&identifier="+ node.name;/* jshint ignore:line */
                return self.ucs.clientRequest(url);
            })
            .then(function(res) {
                assert.object(res);
                return res.body;
            })
            .then(function(data) {
                assert.object(data);
                return waterline.catalogs.create({
                    node: nodeId,
                    source: 'UCS-Rackmount',
                    data: data
                }).then(function() {
                    return nodeId;
                });
            })
            .catch(function(err) {
                logger.error('Ucs Rackmount ', { error:err });
                if(err.message !== 'No Rackmount Members') {
                    throw err;
                }
                return nodeId; // allow
            });
    };
    return UcsCatalogJob;
}
