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
    'Promise'
];

function snmpCollectionJobFactory(
        BaseJob,
        util,
        Logger,
        Snmptool,
        parser,
        assert,
        waterline
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
            return node.snmpSettings;
        })
        .then(function(settings) {
            self.snmptool = new Snmptool(settings.host, settings.community);
            return self.snmptool.collectHostSnmp(self.options.mibs);
        })
        .then(function(snmpData) {
            return self._publishSnmpCommandResult(self.routingKey, snmpData);
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
