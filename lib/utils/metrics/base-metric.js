// Copyright 2014-2015, Renasar Technologies Inc.
/* jshint node: true */

'use strict';

var di = require('di');

module.exports = baseMetricFactory;
di.annotate(baseMetricFactory, new di.Provide('JobUtils.Metrics.Snmp.Base'));
di.annotate(baseMetricFactory, new di.Inject(
    'JobUtils.Snmptool',
    'Assert',
    'Promise',
    '_'
));
function baseMetricFactory(
    SnmpTool,
    assert,
    Promise,
    _
) {

    var sharedOidDescriptionMap = {};

    var oidDescriptionQueryMap = {
        names: 'IF-MIB::ifName',
        processors: 'HOST-RESOURCES-MIB::hrDeviceDescr',
        storage: 'HOST-RESOURCES-MIB::hrStorageDescr'
    };

    function BaseMetric(nodeId, host, community) {
        assert.string(nodeId, 'SNMP metric nodeId');
        assert.string(host, 'SNMP metric host');
        assert.string(community, 'SNMP metric community');
        this.nodeId = nodeId;
        this.snmptool = new SnmpTool(host, community);
        this.oidDescriptionMap = sharedOidDescriptionMap;
    }

    BaseMetric.prototype.updateOidDescriptionMapByType = function(cacheType) {
        var self = this;

        if (!oidDescriptionQueryMap[cacheType]) {
            return Promise.reject(new Error('Unknown OID description map type: ' + cacheType));
        }

        // We want to update the cache for 'names' every time, because interfaces
        // can change or be created if, for example, a new VLAN is added or something is renamed.
        // For everything else, like RAM and Processors, we can assume they will
        // not change, and collecting it just once is enough.
        if (cacheType !== 'names' && !_.isEmpty(self.oidDescriptionMap[self.nodeId], cacheType)) {
            return Promise.resolve(_.keys(self.oidDescriptionMap[self.nodeId]).length);
        }

        return self.snmptool.collectHostSnmp([oidDescriptionQueryMap[cacheType]])
        .then(function(result) {
            _.forEach(result[0].values, function(descr, oid) {
                var elementOid = _.last(oid.split('.'));
                if (!self.oidDescriptionMap[self.nodeId]) {
                    self.initializeDescriptionMapForNode();
                }
                self.oidDescriptionMap[self.nodeId][cacheType][elementOid] = descr;
            });

            return _.keys(result[0].values).length;
        });
    };

    BaseMetric.prototype.initializeDescriptionMapForNode = function() {
        var self = this;
        self.oidDescriptionMap[self.nodeId] = {};
        _.forEach(_.keys(oidDescriptionQueryMap), function(key) {
            self.oidDescriptionMap[self.nodeId][key] = {};
        });
    };

    return BaseMetric;
}
