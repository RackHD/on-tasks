// Copyright 2015, Renasar Technologies Inc.
/* jshint: node:true */

'use strict';

var di = require('di');

module.exports = ProvideCatalogDataJobFactory;
di.annotate(ProvideCatalogDataJobFactory, new di.Provide('Job.Catalogs.ProvideData'));
    di.annotate(ProvideCatalogDataJobFactory,
    new di.Inject(
        'Job.Base',
        'Services.Waterline',
        'JobUtils.CatalogSearchHelpers',
        'Logger',
        'Assert',
        'Util',
        'Promise'
    )
);
function ProvideCatalogDataJobFactory(
    BaseJob,
    waterline,
    catalogSearch,
    Logger,
    assert,
    util,
    Promise
) {
    var logger = Logger.initialize(ProvideCatalogDataJobFactory);

    /**
     * This job searches the catalogs collection for the most recent entry of
     * a catalog with a given 'source', and then adds the value for a path
     * within that object to the shared taskgraph context, e.g.
     *     'dmi.BIOS Information.Version' gets added as:
     *     { context: ami: { biosVersion: <value> } } <- shared taskgraph context
     *
     * @param {Object} options
     * @param {Object} context
     * @param {String} taskId
     * @constructor
     */
    function ProvideCatalogDataJob(options, context, taskId) {
        ProvideCatalogDataJob.super_.call(this, logger, options, context, taskId);
        assert.string(this.context.target);
        assert.string(this.options.path);
        assert.string(this.options.source);
        this.nodeId = this.context.target;
    }
    util.inherits(ProvideCatalogDataJob, BaseJob);

    /**
     * @memberOf ProvideCatalogDataJob
     */
    ProvideCatalogDataJob.prototype._run = function() {
        var self = this;

        Promise.resolve()
        .then(function() {
            return waterline.catalogs.findMostRecent({
                node: self.nodeId,
                source: self.options.source
            });
        })
        .then(function(catalog) {
            if (!catalog) {
                throw new Error("Could not find a catalog entry for " + self.options.source);
            }
            var value = catalogSearch.getPath(catalog.data, self.options.path);
            if (value === undefined) {
                throw new Error(
                    "Could not find value at path '%s' in catalog '%s'".format(
                        self.options.path, self.options.source)
                );
            }
            self.context[self.options.source] = self.context[self.options.source] || {};
            self.context[self.options.source][self.options.path] = value;

            self._done();
        })
        .catch(function(e) {
            self._done(e);
        });
    };

    return ProvideCatalogDataJob;
}
