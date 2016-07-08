// Copyright 2015, EMC, Inc.

'use strict';

var di = require('di');

module.exports = pollerHelperFactory;
di.annotate(pollerHelperFactory, new di.Provide('JobUtils.PollerHelper'));
di.annotate(pollerHelperFactory, new di.Inject(
    '_',
    'Promise',
    'Services.Waterline'
));

function pollerHelperFactory(
    _,
    Promise,
    waterline
) {
    function PollerHelper() {}

    /**
     * Collect all pollers state for node
     * @memberOf PollerHelper
     *
     * @param {String} nodeId - nodeId against who to collect alert message
     * @param {String} oldState - old accessible state for a poller
     * @param {String} newState - new accessible state to be set for a poller
     */
    PollerHelper.prototype.getNodeAlertMsg = function(nodeId, oldState, newState) {
        var alertMsg = {};
        if (oldState === newState){
            return Promise.resolve(alertMsg);
        }
        return waterline.workitems.find({
            node: nodeId,
            name: ['Pollers.SNMP', 'Pollers.IPMI'],
            pollInterval: {'>': 0}
        })
        .map(function (workItem) {
            return workItem.state;
        })
        .then(function(stateArray){
            return waterline.nodes.findByIdentifier(nodeId)
                .then(function(node){
                    stateArray.push(newState);
                    var stateCounter = _.countBy(stateArray); 
                    if (stateCounter.accessible === 1) {
                        alertMsg.nodeType = node.type;
                    }
                    return alertMsg;
                });
        });
    };

    return new PollerHelper();
}
