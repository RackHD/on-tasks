// Copyright 2016, EMC, Inc.

'use strict';

module.exports = updateLookupsJobFactory;

var di = require('di');
di.annotate(updateLookupsJobFactory, new di.Provide('Job.Snmp.Update.Lookups'));
di.annotate(updateLookupsJobFactory, new di.Inject(
    'Job.Base',
    'Assert',
    'Logger',
    'Util',
    'Services.Waterline',
    '_'
    )
);

function updateLookupsJobFactory(
    BaseJob,
    assert,
    Logger,
    util,
    waterline,
    _
) {
    var logger = Logger.initialize(updateLookupsJobFactory);

    function UpdateLookupsJob(options, context, taskId) {
        UpdateLookupsJob.super_.call(this, logger, options, context, taskId);
        assert.string(this.context.target);
        this.nodeId = this.context.target;
    }
    util.inherits(UpdateLookupsJob, BaseJob);

    UpdateLookupsJob.prototype._run = function run() {
        var self = this;
        return waterline.catalogs.findLatestCatalogOfSource(self.nodeId, 'snmp-1')
        .then(function(snmpData) {
            return _.map(snmpData.data, function(val, key) {
                if (key.startsWith("IF-MIB::ifPhysAddress")) {
                    val = _.map(val.split(':'), function(chunk) {
                        return chunk.length > 1 ? chunk : '0' + chunk;
                    }).join(':');
                    return waterline.lookups.upsertNodeToMacAddress(self.nodeId, val);
                }
            });
        })
        .spread(function() {
            self._done();
        })
        .catch(self._done.bind(self));
    };
    return UpdateLookupsJob;
}
