'use strict';

module.exports = snmpCollectionJobFactory;

snmpCollectionJobFactory.$provide = 'Job.Snmp.Collect';
snmpCollectionJobFactory.$inject = [
    'Job.Base',
    'Util',
    'Logger',
    'JobUtils.Snmptool',
    'JobUtils.SnmpParser',
    'Assert'
];

function snmpCollectionJobFactory(BaseJob, util, Logger, Snmptool, parser, assert) {
    var logger = Logger.initialize(snmpCollectionJobFactory);

    function SnmpCollectionJob(options, context, taskId) {
        SnmpCollectionJob.super_.call(this, logger, options, context, taskId);

        this.snmptool = new Snmptool(options.host, options.community);
        this.routingKey = context.graphId;
        assert.uuid(this.routingKey);
    }
    util.inherits(SnmpCollectionJob, BaseJob);

    SnmpCollectionJob.prototype._run = function run() {
        var self = this;

        this.snmptool.collectHostSnmp(self.options.mibs)
        .then(function(snmpData) {
            return self._publishSnmpCommandResult(this.routingKey, snmpData);
        })
        .catch(function(err) {
            logger.error("Failed to collect SNMP data.", {
                data: self.options.mibs,
                error: err
            });
        });
    };
}
