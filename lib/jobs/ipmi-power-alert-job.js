// Copyright 2015, EMC, Inc.

'use strict';

var di = require('di');

module.exports = ipmiPowerAlertJobFactory;
di.annotate(ipmiPowerAlertJobFactory, new di.Provide('Job.Poller.Alert.Ipmi.Power'));
di.annotate(ipmiPowerAlertJobFactory, new di.Inject(
    'Job.Base',
    'Services.Configuration',
    'Logger',
    'Util',
    'Assert',
    'Errors',
    'Promise',
    '_'
));
function ipmiPowerAlertJobFactory(
    BaseJob,
    configuration,
    Logger,
    util,
    assert,
    Errors,
    Promise,
    _
) {
    var logger = Logger.initialize(ipmiPowerAlertJobFactory);

    /**
     * @param {Object} options
     * @param {Object} context
     * @param {String} taskId
     * @constructor
     */
    function IpmiPowerAlertJob(options, context, taskId) {
        IpmiPowerAlertJob.super_.call(this, logger, options, context, taskId);
        this.routingKey = context.graphId;
        assert.uuid(this.routingKey) ;
        this.previousPowerStatus = 'OFF';
    }
    
    util.inherits(IpmiPowerAlertJob, BaseJob);

    /**
     * @memberOf IpmiPowerAlertJob
     */
    IpmiPowerAlertJob.prototype._run = function run() {
        // NOTE: this job will run indefinitely absent user intervention
        var self = this;

        self._subscribeIpmiCommandResult(self.routingKey, 'powerStatus', self.callback);
    };

    /**
     * Compare current and last power states and publish alert on a state change
     * @memberOf IpmiJob
     * @param status
     * @param data
     */
     IpmiPowerAlertJob.prototype.callback = function(data) {
         if (!data) {
            return Promise.resolve();
         }
         var self = this;
         var tmp = {};
         tmp.type = 'polleralert';
         tmp.action = 'chassispower.updated';
         tmp.typeId = data.workItemId;
         tmp.nodeId = data.node;
         tmp.severity = "information";
         tmp.data = {
             states: {
                 last: self.previousPowerStatus === 'ON' ? 'ON' : 'OFF',
                 current: data.powerStatus === 'ON' ? 'ON' : 'OFF'
             }
         };
         if(self.previousPowerStatus !== data.powerStatus) {
             self._publishPollerAlert(tmp);
             self.previousPowerStatus = data.powerStatus;
         }
         return Promise.resolve(data);
    }

    return IpmiPowerAlertJob;
}
