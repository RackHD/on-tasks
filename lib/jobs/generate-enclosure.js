// Copyright 2015, EMC, Inc.

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
    'Promise',
    'Assert',
    '_'
));

function generateEnclosureJobFactory(
    BaseJob,
    waterline,
    catalogSearch,
    Logger,
    util,
    Promise,
    assert,
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
        this.enclConst = Object.freeze({
            type: 'enclosure',
            namePrefix: 'Enclosure Node ',
            relationEncl: 'encloses',
            relationEnclBy: 'enclosedBy',
            snPath: [
                {
                    src: 'ipmi-fru',
                    entry: 'Builtin FRU Device (ID 0).Product Serial'
                },
                {
                    src: 'dmi',
                    entry: 'System Information.Serial Number'
                }]
        });
        assert.isMongoId(this.nodeId);
    }

    util.inherits(GenerateEnclosureJob, BaseJob);


    /**
     * @memberOf GenerateEnclosureJob
     * @returns {Promise}
     */
    GenerateEnclosureJob.prototype._run = function run() {
        var self = this;
        var enclNode;

        Promise.all([
            Promise.any([
                self._findSerialNumber(self.enclConst.snPath[0]),
                self._findSerialNumber(self.enclConst.snPath[1])
            ]),
            waterline.nodes.find({ type: self.enclConst.type })
        ])
        .spread(self._matchEnclosure.bind(self))
        .then(function (matchInfo) {
            // Create an enclosure node if there isn't matched one
            enclNode = matchInfo.encl;

            if (_.isEmpty(enclNode)) {

                var enclData = {
                    name: self.enclConst.namePrefix + matchInfo.sn,
                    type: self.enclConst.type,
                    relations: []
                };

                return waterline.nodes.create(enclData)
                .then(function(node) {
                    if (!node) {
                        return Promise.reject('Could not create enclosure node');
                    }
                    enclNode = node;
                    logger.debug('No matched enclosure, create a new one', {
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

            var enclosedNodes = self._popEnclTarget(enclNode);

            if (enclosedNodes.indexOf(self.nodeId) === -1) {
                // If current compute node id isn't in enclosure node, update the latter

                enclosedNodes.push(self.nodeId);

                enclNode.relations.push({
                    relationType: self.enclConst.relationEncl,
                    targets: enclosedNodes
                });

                return waterline.nodes.updateByIdentifier(
                    enclNode.id,
                    {relations: enclNode.relations});
            }
        })
        .then(function () {
            // Add enclosure node info into compute node

            return waterline.nodes.findByIdentifier(self.nodeId)
            .then(function (node) {
                if (!node) {
                    return Promise.reject('Could not find node with identifier ' + self.nodeId);
                }

                var enclTarget = self._popEnclTarget(node);

                if (enclTarget.length !== 1 ||
                   enclTarget.indexOf(enclNode.id) === -1) {
                    // If enclosedBy relation of the compute node is not this enclosure,
                    // update it to this enclosure node

                    node.relations.push({
                        relationType: self.enclConst.relationEnclBy,
                        targets: [enclNode.id]
                    });

                    return waterline.nodes.updateByIdentifier(
                        self.nodeId,
                        {relations: node.relations});
                }
            });
        })
        .then(function () {
            self._done();
        })
        .catch(function (err) {
            self._done(err);
        });

    };

    /**
     * Find serial number from node's catalog
     * @param {object} enclPath path in catalogs to get serail number
     * @return {Promise}
     */
    GenerateEnclosureJob.prototype._findSerialNumber = function (enclPath) {
        var self = this;

        return waterline.catalogs.findMostRecent({
            node: self.nodeId,
            source: enclPath.src
        }).then(function (catalog) {
            var nodeSn = catalogSearch.getPath(catalog.data, enclPath.entry);
            var regex = /^\S+$/;

            if (!nodeSn) {
                throw new Error("Could not find serial number in source: " + enclPath.src);
            }
            else if (nodeSn.match(regex) === null) {
                throw new Error("No valid serial number in SN: " + nodeSn);
            }
            else {
                return nodeSn;
            }
        });
    };

    /**
     * Find enclosure node that matches given catalog info
     *
     * @param {object} nodeSn node's serial number
     * @param {object} encls enclosure nodes
     * @return {object} matched serial number and enclosure node
     */
    GenerateEnclosureJob.prototype._matchEnclosure = function (nodeSn, encls) {
        var self = this;

        return _.transform(encls, function (result, encl) {
            var enclSn = encl.name.slice(self.enclConst.namePrefix.length, encl.name.length);

            if (enclSn === '') {
                // No serial number in enclosure name, jump to the next entry
                return true;
            }

            if (enclSn === nodeSn) {
                result.encl = encl;
                // Find the match and exit the loop
                return false;
            }
        }, {
            sn: nodeSn,
            encl: {}
        });
    };

    /**
     * Get target nodes of the encloses or enclosedBy relation, and
     * remove this relation type from node's relations
     *
     * @param {object} node
     * @return {array} target nodes
     */
    GenerateEnclosureJob.prototype._popEnclTarget = function (node) {
        var self = this;
        var enclRelation = _.find(node.relations, function(entry) {
            return entry.relationType === self.enclConst.relationEncl ||
                entry.relationType === self.enclConst.relationEnclBy;
        });

        var targetNodes = [];

        if (enclRelation) {
            if (enclRelation.hasOwnProperty('targets')) {
                // Store existing target node id
                targetNodes = enclRelation.targets;
            }

            // Remove encloses relation
            node.relations.pop(enclRelation);
        }

        return targetNodes;
    };

    return GenerateEnclosureJob;
}
