'use strict';

module.exports = snmpCatalogJobFactory;

snmpCatalogJobFactory.$provide = 'Job.Snmp.Catalog';
snmpCatalogJobFactory.$inject = [
    'Job.Base',
    'Logger',
    'Util',
    'Services.Waterline',
    '_',
    'Assert',
    'Promise'
];

function snmpCatalogJobFactory(BaseJob, Logger, util, waterline, _, assert, Promise) {
    var logger = Logger.initialize(snmpCatalogJobFactory);

    function SnmpCatalogJob(options, context, taskId) {
        SnmpCatalogJob.super_.call(this, logger, options, context, taskId);
        this.routingKey = context.graphId;
        this.nodeId = this.context.target;
        assert.uuid(this.routingKey);
    }
    util.inherits(SnmpCatalogJob, BaseJob);

    SnmpCatalogJob.prototype._run = function _run() {
        var self = this;

        self._subscribeSnmpCommandResult(self.routingKey, function(data) {
           Promise.resolve(_.map(data, function(snmpData) {

                return waterline.catalogs.create({
                    node: self.nodeId,
                    source: 'snmp-' + snmpData.source,
                    data: snmpData.value
                });
            }))
            .spread(function() {
                self._done();
            })
            .catch(function(err) {
                self._done(err);
            });
        });
    };
    return SnmpCatalogJob;
}
