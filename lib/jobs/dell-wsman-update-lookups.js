// Copyright © 2018 Dell Inc. or its subsidiaries. All Rights Reserved.

'use strict';

module.exports = updateWsmanLookupsJobFactory;

var di = require('di');
di.annotate(updateWsmanLookupsJobFactory, new di.Provide('Job.Wsman.Update.Lookups'));
di.annotate(updateWsmanLookupsJobFactory, new di.Inject(
    'Job.Base',
    'Assert',
    'Logger',
    'Util',
    'Promise',
    'Services.Waterline',
    '_'
    )
);

function updateWsmanLookupsJobFactory(
    BaseJob,
    assert,
    Logger,
    util,
    Promise,
    waterline,
    _
) {
    var logger = Logger.initialize(updateWsmanLookupsJobFactory);

    function UpdateWsmanLookupsJob(options, context, taskId) {
        UpdateWsmanLookupsJob.super_.call(this, logger, options, context, taskId);
        assert.string(this.context.target);
        this.nodeId = this.context.target;
    }
    util.inherits(UpdateWsmanLookupsJob, BaseJob);

    UpdateWsmanLookupsJob.prototype._run = function run() {
        var self = this;
        return waterline.catalogs.findLatestCatalogOfSource(self.nodeId, 'manager')
        .then(function(smiData) {
            if(!smiData || !smiData.data || !smiData.data.DCIM_IDRACCardView || !smiData.data.DCIM_IDRACCardView.PermanentMACAddress){
                return Promise.reject(new Error('Could not find mac in SMI inventory!'));
            }
            return waterline.lookups.upsertNodeToMacAddress(self.nodeId, smiData.data.DCIM_IDRACCardView.PermanentMACAddress);
        })
        .then(function() {
            self._done();
        })
        .catch(function(err){
            self._done(err);
        });
    };
    return UpdateWsmanLookupsJob;
}
