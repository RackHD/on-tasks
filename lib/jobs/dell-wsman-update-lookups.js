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
    'Services.Waterline'
    )
);

function updateWsmanLookupsJobFactory(
    BaseJob,
    assert,
    Logger,
    util,
    Promise,
    waterline
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
        .then(function(smiManagerData){
            if(!smiManagerData || !smiManagerData.data || !smiManagerData.data.DCIM_IDRACCardView || !smiManagerData.data.DCIM_IDRACCardView.PermanentMACAddress)
                {return Promise.reject(new Error('Could not found management mac in SMI inventory!'));}
            return waterline.lookups.upsertNodeToMacAddress(self.nodeId, smiManagerData.data.DCIM_IDRACCardView.PermanentMACAddress);
        })
        .then(function(){
            return waterline.catalogs.findLatestCatalogOfSource(self.nodeId, 'nics');
        })
        .then(function(smiNicData) {
            if(!smiNicData || !smiNicData.data){
                return Promise.reject(new Error('Could not found nic mac in SMI inventory!'));}
            return _.map(smiNicData.data, function(item){
                return waterline.lookups.upsertNodeToMacAddress(self.nodeId, item.currentMACAddress);
                })
        })
        .then(function() {
            return self._done();
        })
        .catch(function(err){
            self._done(err);
        });
        self._done();
    };
    return UpdateWsmanLookupsJob;
}
