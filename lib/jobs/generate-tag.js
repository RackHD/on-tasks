// Copyright 2016, EMC, Inc.

'use strict';

var di = require('di');

module.exports = generateTagJobFactory;
di.annotate(generateTagJobFactory, new di.Provide('Job.Catalog.GenerateTag'));
di.annotate(generateTagJobFactory, new di.Inject(
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
function generateTagJobFactory(
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

    var logger = Logger.initialize(generateTagJobFactory);

    /**
     *
     * @param {Object} [options]
     * @constructor
     */
    function GenerateTagJob(options, context, taskId) {
        GenerateTagJob.super_.call(this, logger, options, context, taskId);

        this.nodeId = context.target || options.nodeId;
        assert.isMongoId(this.nodeId, 'context.target || options.nodeId');
    }

    util.inherits(GenerateTagJob, BaseJob);

    var RULE_DELIMITER = /\./g;

    /**
     * @memberOf GenerateTagJob
     * @returns {Promise}
     */
    GenerateTagJob.prototype._run = function run() {
        var self = this;

        waterline.tags.find({}).then(function (tags) {
            var catalogTypes = _(tags)
                .pluck('rules')
                .flattenDeep()
                .pluck('path')
                .map(function (path) {
                    return _.compact(path.split(RULE_DELIMITER))[0];
                })
                .uniq()
                .value();
            return [ Promise.map(catalogTypes, function(type) {
                return waterline.catalogs.findMostRecent({
                    node: self.nodeId,
                    source: type
                });
            }), tags ];
        }).spread(function(catalogs, tags) {
            catalogs = _(catalogs)
                .flattenDeep()
                .compact()
                .transform(function (catalogs, catalog) {
                    catalogs[catalog.source] = catalog.data;
                }, {})
                .value();

            var matches = _.filter( matchTags(catalogs, tags), function(match) {
                return match.tag.rules.length && !match.errors.length;
            });

            var tagNames = _(matches).pluck('tag.name').value();
            if( !_.isEmpty(tagNames)) {
                return waterline.nodes.addTags(self.nodeId, tagNames);
            }
        }).then(function() {
            self._done();
        }).catch(function(err) {
            self._done(err);
        });
    };

    function matchTags(catalogs, tags) {
        return _.map(tags, function (tag) {
            var result = _.reduce(tag.rules, function (result, rule) {
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
            result.tag = tag;
            return result;
        });
    }

    return GenerateTagJob;
}
