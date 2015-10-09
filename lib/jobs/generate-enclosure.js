// Copyright 2015, EMC, Inc.
/* jshint node:true */
'use strict';

var di = require('di');

module.exports = generateEnclosureJobFactory;
di.annotate(generateEnclosureJobFactory, new di.Provide('Job.Catalog.GenerateEnclosure'));
di.annotate(generateEnclosureJobFactory, new di.Inject(
    'Job.Base',
    'Services.Waterline',
    'JobUtils.CatalogSearchHelpers',
    'Logger',
    'Util',
    '_'
));

function generateEnclosureJobFactory(
    BaseJob,
    waterline,
    catalogSearch,
    Logger,
    util,
    _
) {

    var logger = Logger.initialize(generateEnclosureJobFactory);

    /**
     *
     * @param {Object} [options]
     * @constructor
     */
    function GenerateEnclosureJob(options, context, taskId) {
        GenerateEnclosureJob.super_.call(this, logger, options, context, taskId);

        this.nodeId = context.target || options.nodeId;
    }

    util.inherits(GenerateEnclosureJob, BaseJob);

    var ENCL_SN_SRC = 'ipmi-fru';
    var ENCL_SN_PATH = 'Builtin FRU Device (ID 0).Product Serial';

    /**
     * @memberOf GenerateEnclosureJob
     * @returns {Promise}
     */
    GenerateEnclosureJob.prototype._run = function run() {
        var self = this;
        var enclNode;
        waterline.catalogs.findMostRecent({
            node: self.nodeId,
            source: ENCL_SN_SRC
        })
        .then(function (catalog) {
            // Find matched enclosure

            return waterline.nodes.find({ type: 'enclosure' })
            .then(function (encls) {
                return matchEnclosure(catalog, encls);
             });
        })
        .then(function (matchInfo) {
            // Create an enclosure node if there isn't matched one
            enclNode = matchInfo.encl;

            if (_.isEmpty(enclNode)) {

                var enclData = {
                    name: 'Enclosure Node ' + matchInfo.sn,
                    type: 'enclosure',
                    relations: [{
                        relationType: 'encloses',
                        targets: []
                    }]
                };

                return waterline.nodes.create(enclData)
                .then(function(node) {
                    enclNode = node;
                    logger.debug('No matching enclosure, create a new one', {
                        id: self.nodeId,
                        enclosure: enclNode.id
                    });
                });
            }
            else {
                logger.debug(enclNode.name + ' matched', {
                    id: self.nodeId,
                    enclosure: enclNode.id
                });
            }
        })
        .then(function () {
            // Add compute node info into enclosure node

            var relation = _.find(enclNode.relations, { relationType: 'encloses' });
            var enclosedNode = relation.targets;
            if (enclosedNode.indexOf(self.nodeId) === -1) {
                // If current compute node id isn't in enclosure node, update the latter

                enclosedNode.push(self.nodeId);

                var updateData = {
                    relations: [{
                        relationType: 'encloses',
                        targets: enclosedNode
                    }]
                };

                return waterline.nodes.updateByIdentifier(enclNode.id, updateData);
            }
        })
        .then(function () {
            // Add enclosure node info into compute node

            var updateData = {
                relations: [{
                    relationType: 'enclosedBy',
                    targets: [enclNode.id]
                }]
            };

            return waterline.nodes.updateByIdentifier(self.nodeId, updateData);
        })
        .then(function () {
            self._done();
        })
        .catch(function (err) {
            self._done(err);
        });

    };

    function matchEnclosure(catalog, encls) {
        var nodeSn = catalogSearch.getPath(catalog.data, ENCL_SN_PATH);
        var regex = /[\w]+$/;

        if (!nodeSn) {
            throw new Error("Could not find serial number in path: " + ENCL_SN_PATH);
        }

        if (nodeSn.match(regex) === null) {
            throw new Error("No valid serial number in SN: " + nodeSn);
        }

        return _.transform(encls, function (result, encl) {
            var match = encl.name.match(regex);
            var enclSn;

            if (match === null) {
                // No serial number in enclosure name, jump to next entry
                return true;
            }

            enclSn = match[0];
            if (enclSn === nodeSn) {
                result.encl = encl;
                // Find the match and exit the loop
                return false;
            }
        }, {
            sn: nodeSn,
            encl: {}
        });
    }

    return GenerateEnclosureJob;
}
