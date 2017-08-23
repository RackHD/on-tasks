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
                    entry: 'Builtin FRU Device (ID 0).Chassis Serial'
                },
                {
                    src: 'dmi',
                    entry: 'Chassis Information.Serial Number'
                },
                {
                    src: 'ipmi-fru',
                    entry: 'Builtin FRU Device (ID 0).Product Serial'
                },
                {
                    src: 'dmi',
                    entry: 'System Information.Serial Number'
                }
            ]
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

        Promise.any([
            self._findSerialNumber(self.enclConst.snPath[0]),
            self._findSerialNumber(self.enclConst.snPath[1]),
            self._findSerialNumber(self.enclConst.snPath[2]),
            self._findSerialNumber(self.enclConst.snPath[3])
        ])
        .then(function(nodeSn){
            var enclName = self.enclConst.namePrefix + nodeSn;
            var enclData = {
                name: enclName,
                type: self.enclConst.type,
                relations: []
            };
            return waterline.nodes.findOrCreate({ type: self.enclConst.type, name: enclName}, enclData);
        })
        .then(function(node) {
            if (!node) {
                return Promise.reject('Could not create enclosure node');
            }
            enclNode = node;
            logger.debug('findOrCreate enclosure', {
                id: self.nodeId,
                enclosure: enclNode.id
            });
        })
        .then(function () {
            // Add compute relations into enclosure node
            return self.addRelation(enclNode, self.enclConst.relationEncl, self.nodeId);
        })
        .then(function () {
            // Add enclosure node info into compute node
            return waterline.nodes.findByIdentifier(self.nodeId)
            .then(function (node) {
                if (!node) {
                    return Promise.reject('Could not find node with identifier ' + self.nodeId);
                }
                return self.addRelation(node, self.enclConst.relationEnclBy, enclNode);
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
     * This function is duplicated with on-http/lib/service/node-api-service.js/addRelation
     * Add the given target nodes to the given relationType on the given node. Fail
     * silently with missing arguments. If a relation does not already exist on the node
     * create it, otherwise append to the existing one.
     * @param  {Object} node - node whose relation needs to be updated
     * @param  {String} type - relation type that needs to be updated
     * @param  {String[] | Object[]}  targets - nodes or ids in relation type that to be added
     * @return {Object}  the updated node
     */
    GenerateEnclosureJob.prototype.addRelation = function addRelation(node, type, targets) {
        if (!(node && type && targets)) {
            return;
        }
        return waterline.nodes.addFieldIfNotExistByIdentifier(node.id, "relations", [])
        .then(function(){
            var relationsItemToBeAdded = {
                relations: [{relationType: type, targets: []}]
            };
            var existSign = [{relationType: type}];
            return waterline.nodes.addListItemsIfNotExistByIdentifier(
                node.id, 
                relationsItemToBeAdded, 
                existSign
            );
        })
        .then(function(modifiedNode){
            if (!modifiedNode){
                return node;
            }
            return modifiedNode;
        })
        .then(function(modifiedNode){
            var targetsItems = _.map([].concat(targets), function(targetNode) {
                targetNode = targetNode.id || targetNode;
                if(targetNode === node.id ) {
                    return Promise.reject(new Error('Node cannot have relationship '+type+' with itself'));
                }
                return targetNode;
            });
            var index = _.findIndex(modifiedNode.relations, { relationType: type });
            var field = ["relations.", String(index),".targets"].join("");
            var targetsToBeAdded = {};
            targetsToBeAdded[field] = _.uniq(targetsItems);

            // Can not make sure prevent every exception in high concurrency.
            if (type === 'containedBy' && 
                modifiedNode.relations[index].targets.length + targets.length > 1) {
                return Promise.reject(new Error("Node "+node.id+" can only be contained by one node"));
            }

            // Compute node can only have one enclosure target.
            if (type === "enclosedBy") {
                var targetsToBeRemoveded = {};
                targetsToBeRemoveded[field] = [modifiedNode.relations[index].targets[0]];
                return waterline.nodes.removeListItemsByIdentifier(
                    node.id, targetsToBeRemoveded
                )
                .then(function(){
                    return targetsToBeAdded;
                });
            }
            return targetsToBeAdded;
        })
        .then(function(targetsToBeAdded){
            return waterline.nodes.addListItemsIfNotExistByIdentifier(
                 node.id, targetsToBeAdded
            );
        });
    };
    return GenerateEnclosureJob;
}
