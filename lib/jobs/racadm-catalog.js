
// Copyright 2016, EMC, Inc.

'use strict';

var di = require('di');

module.exports = racadmCatalogJobFactory;
di.annotate(racadmCatalogJobFactory, new di.Provide('Job.Dell.RacadmCatalog'));
di.annotate(racadmCatalogJobFactory, new di.Inject(
    'Job.Base',
    'JobUtils.RacadmTool',
    'Logger',
    'Util',
    'Assert',
    'Promise',
    '_',
    'Services.Waterline',
    'JobUtils.JobHelpers'
));

function racadmCatalogJobFactory(
    BaseJob,
    racadmTool,
    Logger,
    util,
    assert,
    Promise,
    _,
    waterline,
    jobHelper
) {
    var logger = Logger.initialize(racadmCatalogJobFactory);
    function RacadmCatalogJob(options, context, taskId) {
        RacadmCatalogJob.super_.call(this, logger, options, context, taskId);

        this.nodeId = this.context.target;
        this.action = options.action;
    }
    util.inherits(RacadmCatalogJob, BaseJob);

    /**
     * @memberOf RacadmCatalogJob
     */
    RacadmCatalogJob.prototype._run = function() {
        var self = this;
        return waterline.obms.findByNode(self.nodeId, 'ipmi-obm-service', true)
            .then(jobHelper.lookupHost)
            .then(function(obmSetting) {
                assert.func(racadmTool[self.action]);
                return racadmTool[self.action](obmSetting.config.host, obmSetting.config.user,
                    obmSetting.config.password);
            })
            .then(function(catalog){
                self.handleResponse(catalog);
                self._done();
            })
            .catch(function(err) {
                self._done(err);
            });

    };

    RacadmCatalogJob.prototype.handleResponse = function(result) {
        var self = this;

        return Promise.resolve(result)
            .then(function() {
                var addCatalogPromises = [];

                if (result.error) {
                    logger.error("Failed to get catalog for " + result.source, {
                        error: result.error,
                        result: result
                    });
                } else {
                    if (result.store) {
                        addCatalogPromises.push(
                            Promise.resolve(waterline.catalogs.create({
                                node: self.nodeId,
                                source: result.source,
                                data: result.data
                            }))
                        );
                    } else {
                        logger.debug("Catalog result for " + result.source +
                            " has not been marked as significant. Not storing.");
                    }
                }
                return addCatalogPromises;
            }).catch(function(err) {
                logger.error("Job error processing catalog output.", {
                    error: err,
                    id: self.nodeId,
                    taskContext: self.context
                });
            });
    };

    return RacadmCatalogJob;
}
