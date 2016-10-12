// Copyright 2016, EMC, Inc.

'use strict';

var di = require('di');

module.exports = pduRelationsJobFactory;
di.annotate(pduRelationsJobFactory, new di.Provide('Job.Catalog.PduRelations'));
di.annotate(pduRelationsJobFactory, new di.Inject(
    'Job.Base',
    'Services.Waterline',
    'Logger',
    'Util',
    'Constants',
    'Promise',
    '_'
));

function pduRelationsJobFactory(
    BaseJob,
    waterline,
    Logger,
    util,
    Constants,
    Promise,
    _
) {

    var logger = Logger.initialize(pduRelationsJobFactory);

    /**
     *
     * @param {Object} [options]
     * @constructor
     */
    function PduRelationsJob(options, context, taskId) {
        PduRelationsJob.super_.call(this, logger, options, context, taskId);

        this.nodeId = context.target || options.nodeId;
    }

    util.inherits(PduRelationsJob, BaseJob);

    /**
     * Globals
     */

    var NODE_RELATION_TYPE = 'poweredBy';
    var PDU_RELATION_TYPE = 'powers';

    /**
     * @memberOf PduRelationsJob
     */
    PduRelationsJob.prototype._run = function run() {
        var self = this;
        return waterline.nodes.needByIdentifier(self.nodeId)
        .then(function (node) {
            if (node.type !== Constants.NodeTypes.Pdu) {
                throw new Error('Task runs only on PDU nodes');
            }
            var pduHost = _adjustIpStrFormat(node.snmpSettings.host);
            return self._searchObmServices(pduHost, node);
        })
        .then(function () {
            self._done();
        })
        .catch(function (err) {
            self._done(err);
        });

    };

    PduRelationsJob.prototype._searchObmServices =
        function _searchObmServices(pduHost, pduNode) {
            var self = this;
            return Promise.try(function () {
                return waterline.obms.find();
            })
            .filter(function (obm) {
                return (_validateIpAddressFormat(obm.config.host));
            })
            .map(function (result) {
                /* Compare hosts
                 * If PDu host and the pdu obm service host are equal
                 * Then create the relation between node and discoverd pdu
                */
                var obmServiceHost = _adjustIpStrFormat(result.config.host);
                if (pduHost === obmServiceHost) {
                    //find the node
                    return self.updatePoweredNodeRelations(result.node)
                   .then(function () {
                       return self.updatePduNodeRelations(pduNode, result.node);
                   });
                }
            });
        };

    PduRelationsJob.prototype.updatePoweredNodeRelations =
        function _updatePoweredNodeRelations(poweredNodeId) {
            var self = this;
            var targetNode;
            return waterline.nodes.findByIdentifier(poweredNodeId)
            .then(function (node) {
                if (!node) {
                    throw new Error('Could not find node with identifier ' + node);
                }
                targetNode = node;
                return node.relations;
            })
            .filter(function (entry) {
                //return entries except the one with relation type = poweredBy
                return (entry.relationType !== NODE_RELATION_TYPE);
            })
            .then(function (relations) {
                //update PDU relation type powers
                var targets = _getTargets(targetNode, NODE_RELATION_TYPE);
                if (targets.indexOf(self.nodeId) < 0) {
                    targets.push(self.nodeId);
                }
                relations.push({
                    relationType: NODE_RELATION_TYPE,
                    targets: targets
                });
                return waterline.nodes.updateByIdentifier(
                    poweredNodeId,
                    { relations: relations });
            });
        };

    PduRelationsJob.prototype.updatePduNodeRelations =
        function _updatePduNodeRelations(pduNode, poweredNodeId) {
            return Promise.try(function () {
                return pduNode.relations;
            })
            .filter(function (entry) {
                //return entries except the one with relation type = powers
                return (entry.relationType !== PDU_RELATION_TYPE);
            })
            .then(function (pduRelations) {
                //update PDU relation type powers
                var targets = _getTargets(pduNode, PDU_RELATION_TYPE);
                if (targets.indexOf(poweredNodeId) < 0) {
                    targets.push(poweredNodeId);
                }
                pduRelations.push({
                    relationType: PDU_RELATION_TYPE,
                    targets: targets
                });
                return waterline.nodes.updateByIdentifier(
                    pduNode.id,
                    { relations: pduRelations });
            });
        };

    /**
     * verify ip address is 4 dec nbs separated by '.'
     * returns a booleen
     */
    function _validateIpAddressFormat(ipString) {
        var regex = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/;
        return regex.test(ipString);
    }

    /**
     * Adjust ip Address format to 3 digits
     * return ip address string
     */
    function _adjustIpStrFormat(ipString) {
        var ip = ipString.split('.');
        ipString = '';
        for (var i = 0; i < ip.length; i += 1) {
            switch (ip[i].length) {
                case 1:
                    ip[i] = '00' + ip[i];
                    break;
                case 2:
                    ip[i] = '0' + ip[i];
                    break;
                default:
                    break;
            }
            ipString += ip[i];
        }
        return ipString.trim();
    }

    function _getTargets(node, relationType) {
        var targets = [];
        var relation = _.find(node.relations, function (entry) {
            return entry.relationType === relationType;
        });
        if (relation) {
            targets = relation.targets;
        }
        return targets;
    }

    return PduRelationsJob;
}
