// Copyright 2014-2015, Renasar Technologies Inc.
/* jshint: node:true */
'use strict';

var di = require('di');

module.exports = generateSkuJobFactory;
di.annotate(generateSkuJobFactory, new di.Provide('Job.Catalog.GenerateSku'));
di.annotate(generateSkuJobFactory, new di.Inject(
    'Job.Base',
    'Services.Waterline',
    'Protocol.Events',
    'JobUtils.CatalogSearchHelpers',
    'anchor',
    'Logger',
    'Util',
    'Promise',
    'Assert',
    '_'
));
function generateSkuJobFactory(
    BaseJob,
    waterline,
    eventsProtocol,
    catalogSearch,
    anchor,
    Logger,
    util,
    Promise,
    assert,
    _
) {

    var logger = Logger.initialize(generateSkuJobFactory);

    /**
     *
     * @param {Object} [options]
     * @constructor
     */
    function GenerateSkuJob(options, context, taskId) {
        GenerateSkuJob.super_.call(this, logger, options, context, taskId);

        this.nodeId = context.target || options.nodeId;
        assert.isMongoId(this.nodeId, 'context.target || options.nodeId');
    }

    util.inherits(GenerateSkuJob, BaseJob);

    var RULE_DELIMITER = /\./g;

    /**
     * @memberOf GenerateSkuJob
     * @returns {Promise}
     */
    GenerateSkuJob.prototype._run = function run() {
        var self = this;
        waterline.skus.find({}).then(function (skus) {
            var catalogTypes = _(skus)
                .pluck('rules')
                .flatten()
                .pluck('path')
                .map(function (path) {
                    return _.compact(path.split(RULE_DELIMITER))[0];
                })
                .uniq()
                .value();

            return Promise.all(_.map(catalogTypes, function (type) {
                return waterline.catalogs.findMostRecent({
                    node: self.nodeId,
                    source: type
                });
            })).then(function (catalogs) {
                catalogs = _(catalogs)
                    .flatten()
                    .compact()
                    .transform(function (catalogs, catalog) {
                        catalogs[catalog.source] = catalog.data;
                    }, {})
                    .value();

                var matches = matchSkus(catalogs, skus);

                _.forEach(matches, function (match) {
                    var totalRules = match.sku.rules.length;
                    var errorCount = match.errors.length;
                    if (totalRules > 0) {
                        var matchRatio = (totalRules - errorCount) / totalRules;
                        logger.silly('SKU ' + match.sku.name + ' matched ' +
                                     Math.round(matchRatio * 100) + '%', {
                            id: self.nodeId,
                            sku: match.sku.id
                        });
                    }
                });

                _.remove(matches, function (match) {
                    return match.errors.length > 0;
                });
                // get most recently created SKU with the deepest rule
                matches = _.sortBy(matches, function (match) {
                    return match.sku.createdAt;
                });
                matches = _.sortBy(matches, 'maxDepth');
                var match = matches[matches.length - 1];


                if (match && match.sku) {
                    logger.debug('Assigning SKU ' + match.sku.name, {
                        id: self.nodeId,
                        sku: match.sku.id
                    });
                } else {
                    logger.debug('No matching SKU', {
                        id: self.nodeId,
                        sku: null
                    });
                }

                return waterline.nodes.updateByIdentifier(self.nodeId, {
                    sku: match && match.sku ? match.sku.id : null
                })
                .then(function() {
                    if (match && match.sku) {
                        return eventsProtocol.publishSkuAssigned(self.nodeId, match.sku.id);
                    }
                });
            });
        }).then(function () {
            self._done();
        }, function (err) {
            self._done(err);
        });
    };

    function matchSkus(catalogs, skus) {
        return _.map(skus, function (sku) {
            var result = _.reduce(sku.rules, function (result, rule) {
                var path = _.compact(rule.path.split(RULE_DELIMITER));
                var depth = path.length;
                var value = catalogSearch.getPath(catalogs, path.join('.'));
                return {
                    maxDepth: Math.max(depth, result.maxDepth),
                    errors: result.errors.concat(anchor(value).to(_.omit(rule, 'path')) || []),
                };
            }, {
                maxDepth: 0,
                errors: []
            });
            result.sku = sku;
            return result;
        });
    }

    return GenerateSkuJob;
}
