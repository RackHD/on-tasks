'use strict';

module.exports = snmpCollectionJobFactory;

snmpCollectionJobFactory.$provide = 'Job.Snmp.Collect';
snmpCollectionJobFactory.$inject = [
    'Job.Base',
    'Util',
    'Logger',
    'JobUtils.Snmptool',
    'JobUtils.SnmpParser',
    'Assert',
    'Services.Waterline',
    'Services.Encryption'
];

function snmpCollectionJobFactory(
        BaseJob,
        util,
        Logger,
        Snmptool,
        parser,
        assert,
        waterline,
        encryption
) {
    var logger = Logger.initialize(snmpCollectionJobFactory);

    function SnmpCollectionJob(options, context, taskId) {
        SnmpCollectionJob.super_.call(this, logger, options, context, taskId);

        this.nodeId = this.context.target;
        this.routingKey = context.graphId;
        assert.uuid(this.routingKey);
    }
    util.inherits(SnmpCollectionJob, BaseJob);

    SnmpCollectionJob.prototype._run = function run() {
        var self = this;


        waterline.nodes.findByIdentifier(self.nodeId)
        .then(function (node) {
            assert.ok(node, "Node should exist to respond to SNMP");
            assert.ok(node.snmpSettings, "Node should have SNMP settings");

            var snmptool = new Snmptool(node.snmpSettings.host,
                                        encryption.decrypt(node.snmpSettings.community));
            return [node, snmptool.collectHostSnmp(self.options.oids)];
        })
        .spread(function(node, result) {
            var data = {
                host: node.snmpSettings.host,
                community: node.snmpSettings.community,
                result: result
            };
            return self._publishSnmpCommandResult(self.routingKey, data);
        })
        .then(function() {
            self._done();
        })
        .catch(function(err) {
            self._done(err);
        });
    };

    return SnmpCollectionJob;
}
