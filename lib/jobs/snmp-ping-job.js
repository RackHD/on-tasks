
'use strict';

module.exports = snmpPingJobFactory;

snmpPingJobFactory.$provide = 'Job.Snmp.Ping';
snmpPingJobFactory.$inject = [
    'Job.Base',
    'JobUtils.Snmptool',
    'Logger',
    'Util'
];

function snmpPingJobFactory(BaseJob, Snmptool, Logger, util) {
    var logger = Logger.initialize(snmpPingJobFactory);

    function SnmpPingJob(options, context, taskId) {
        SnmpPingJob.super_.call(this, logger, options, context, taskId);
        this.snmptool = new Snmptool(options.host, options.community);
    }
    util.inherits(SnmpPingJob, BaseJob);

    SnmpPingJob.prototype._run = function _run() {
        var self = this;

        return this.snmptool.ping()
        .then(function () {
            self.done();
        })
        .catch(function (err){
            logger.error("Failed to ping host", { error: err });
            self.done(err);
        });
    };

    return SnmpPingJob;
}
