// Copyright © 2018 Dell Inc. or its subsidiaries. All Rights Reserved.

'use strict';

module.exports = RedfishUpdateLookupsJobFactory;

var di = require('di');
di.annotate(RedfishUpdateLookupsJobFactory, new di.Provide('Job.Redfish.Update.Lookups'));
di.annotate(RedfishUpdateLookupsJobFactory, new di.Inject(
    'Job.Base',
    'Assert',
    'Logger',
    'Util',
    'Promise',
    'Services.Waterline',
    '_'
));

function RedfishUpdateLookupsJobFactory(
    BaseJob,
    assert,
    Logger,
    util,
    Promise,
    waterline,
    _
) {
    var logger = Logger.initialize(RedfishUpdateLookupsJobFactory);

    function RedfishUpdateLookupsJob(options, context, taskId) {
        RedfishUpdateLookupsJob.super_.call(this, logger, options, context, taskId);
        this.chassis = this.context.chassis || [];
        this.systems = this.context.systems || [];
        this.cooling = this.context.cooling || [];
        this.power = this.context.power || [];
        this.networks = this.context.networks || [];
        this.allEndpoints = _.union(
            this.systems,
            this.power,
            this.cooling,
            this.networks,
            this.chassis
        );
    }

    util.inherits(RedfishUpdateLookupsJob, BaseJob);

    RedfishUpdateLookupsJob.prototype._run = function() {
        var self = this;
        return Promise.resolve(self.allEndpoints)
        .map(self.updateLookups.bind(self), {concurrency: 128})
        .then(function() {
            return self._done();
        })
        .catch(function(err) {
            return self._done(err);
        });
    };

    RedfishUpdateLookupsJob.prototype.updateLookups = function(nodeId) {
        var ethernetInterfacesSource = '/redfish/v1/Systems/' + nodeId + '/EthernetInterfaces';
        return waterline.catalogs.findLatestCatalogOfSource(nodeId, ethernetInterfacesSource)
        .then(function(ethernetInterfacesCatalog){
            if(!_.has(ethernetInterfacesCatalog, 'data.Members')) {
                throw new Error('Could not find Members in EthernetInterfaces catalog!');
            }
            return _.map(ethernetInterfacesCatalog.data.Members, function(member){
                return _.last(_.get(member, "@odata_id").split('/'));
            });
        })
        .map(function(nicId){
            var nicSource = ethernetInterfacesSource + '/' + nicId;
            return waterline.catalogs.findLatestCatalogOfSource(nodeId, nicSource)
            .then(function(nicCatalog) {
                if(!nicCatalog || !nicCatalog.data || !nicCatalog.data.MacAddress) {
                    throw new Error('Could not find MacAddress in NIC catalog!');
                }
                return waterline.lookups.upsertNodeToMacAddress(
                    nodeId,
                    nicCatalog.data.MacAddress
                );
            });
        });
    };

    return RedfishUpdateLookupsJob;
}
