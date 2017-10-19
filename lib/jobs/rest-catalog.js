// Copyright 2016, EMC, Inc

'use strict';

var di = require('di');

module.exports = RestCatalogJobFactory;
di.annotate(RestCatalogJobFactory, new di.Provide('Job.Rest.Catalog'));
di.annotate(RestCatalogJobFactory, new di.Inject(
    'Job.Base',
    'Logger',
    '_',
    'Assert',
    'Promise',
    'Util',
    'HttpTool',
    'Services.Waterline'));

function RestCatalogJobFactory(BaseJob, Logger, _, assert, Promise, util, HttpTool, waterline){
    var logger = Logger.initialize(RestCatalogJobFactory);

    /**
    * The interface that runs Rest Job from tasks
    * @constructor
    */
    function RestCatalog(options, context, taskId){
        var self = this;
        self.options = options;
        self.context = context;

        RestCatalog.super_.call(self, logger, options, context, taskId);
        self.restClient = new HttpTool();
    }

    util.inherits(RestCatalog, BaseJob);

    RestCatalog.prototype._run = function run(){
        var self = this;

        logger.debug("Runnging A Rest Call");
        self.restClient.setupRequest(self.options)
        .then(function(){
            return self.restClient.runRequest();
        })
        .then(function(data){
            self.context.restData = data;
            waterline.catalogs.findOrCreate(
                // Find existion catalog
                {
                    node: self.context.target,
                    source: self.options.source
                },
                // Or create new
                {
                    node: self.context.target,
                    source: self.options.source,
                    data: {}
                }
            )
            .then(function(catalog){
                waterline.catalogs.updateByIdentifier(catalog.id, {data: data.body})
                .then(function(){
                    self._done();
                });
            })
            .catch(function(err){
                logger.error("Found error during catalogging.", {error: err});
                self._done(err);
            });
        })
        .catch(function(err){
            logger.error("Found error during HTTP request.", {error: err});
            self._done(err);
        });
    };

    return RestCatalog;
}
