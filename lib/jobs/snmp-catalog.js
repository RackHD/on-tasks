'use strict';

module.exports = snmpCatalogJobFactory;

snmpCatalogJobFactory.$provide = 'Job.Snmp.Catalog';
snmpCatalogJobFactory.$inject = [
    'Job.Base',
    'Logger',
    'Util',
    'Services.Waterline'
];

function snmpCatalogJobFactory(BaseJob, Logger, util, waterline) {
    var logger = Logger.initialize(snmpCatalogJobFactory);

    function SnmpCatalogJob(options, context, taskId) {
        SnmpCatalogJob.super_.call(this, logger, options, context, taskId);
        this.routingKey = context.graphId;
    }
    util.inherits(SnmpCatalogJob, BaseJob);

    SnmpCatalogJob.prototype._run = function _run() {
        var self = this;

        self._subscribeRunSnmpCommandResult(self.routingKey, function(data) {
            return [
                waterline.nodes.create({ name: 'le switch'}),
                data
            ];
        })
        .spread(function(node, data) {
            return waterline.catalogs.create({
                node: node,
                source: 'snmp',
                data: data
            });
        });
    };
}
