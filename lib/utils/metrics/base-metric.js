// Copyright 2014-2015, Renasar Technologies Inc.
/* jshint node: true */

'use strict';

var di = require('di');

module.exports = baseMetricFactory;
di.annotate(baseMetricFactory, new di.Provide('JobUtils.Metrics.Snmp.Base'));
di.annotate(baseMetricFactory, new di.Inject(
    'JobUtils.Snmptool',
    'Assert',
    '_'
));
function baseMetricFactory(
    SnmpTool,
    assert,
    _
) {

    var sharedInterfaceCache = {};

    function BaseMetric(nodeId, host, community) {
        assert.string(nodeId, 'SNMP metric nodeId');
        assert.string(host, 'SNMP metric host');
        assert.string(community, 'SNMP metric community');
        this.nodeId = nodeId;
        this.snmptool = new SnmpTool(host, community);
        this.interfaceCache = sharedInterfaceCache;
    }

    BaseMetric.prototype.updateInterfaceNames = function() {
        var self = this;
        var cacheIncomplete;

        return self.snmptool.collectHostSnmp(['IF-MIB::ifAlias'])
        .then(function(result) {
            if (!_.has(self.interfaceCache, self.nodeId)) {
                cacheIncomplete = true;
            } else {
                cacheIncomplete = _.some(result[0].values, function(oid) {
                    var interfaceOid = _.last(oid.split('.'));
                    return !_.has(self.interfaceCache[self.nodeId].names, interfaceOid);
                });
            }

            if (!cacheIncomplete) {
                return [ result[0] ];
            }

            return [
                result[0],
                self.snmptool.collectHostSnmp(['IF-MIB::ifName'])
                .then(function(result) {
                    _.forEach(result[0].values, function(name, oid) {
                        var alias = _.last(oid.split('.'));
                        if (!self.interfaceCache[self.nodeId]) {
                            self.initializeNodeCache();
                        }
                        self.interfaceCache[self.nodeId].names[alias] = name;
                    });
                })
            ];
        });
    };

    BaseMetric.prototype.initializeNodeCache = function() {
        this.interfaceCache[this.nodeId] = {
            names: {},
            counters: {}
        };
    };

    return BaseMetric;
}
