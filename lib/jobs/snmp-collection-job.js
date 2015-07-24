'use strict';

module.exports = snmpCollectionJobFactory;
var di = require('di');

di.annotate(snmpCollectionJobFactory, new di.Provide('Job.Snmp.Collect'));
di.annotate(snmpCollectionJobFactory, new di.Inject(
    'Job.Base',
    'Util',
    'Logger',
    'JobUtils.Snmptool',
    'Assert',
    'Services.Waterline',
    'Services.Encryption'
    )
);

function snmpCollectionJobFactory(
        BaseJob,
        util,
        Logger,
        Snmptool,
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
        this.snmpOptions = options.snmpQueryType ?
            { snmpQueryType: options.snmpQueryType } : { snmpQueryType: 'walk' };
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
            return [node, snmptool.collectHostSnmp(self.options.oids, self.snmpOptions)];
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
