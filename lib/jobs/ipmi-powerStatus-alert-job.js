// Copyright 2015, EMC, Inc.

'use strict';

var di = require('di');

module.exports = powerStatusAlertJobFactory;
di.annotate(powerStatusAlertJobFactory, new di.Provide('Job.Poller.Alert.Ipmi.PowerStatus'));
di.annotate(powerStatusAlertJobFactory, new di.Inject(
    'Job.Base',
    'Services.Configuration',
    'Logger',
    'Util',
    'Assert',
    'Errors',
    'Promise',
    '_'
));
function powerStatusAlertJobFactory(
    BaseJob,
    configuration,
    Logger,
    util,
    assert,
    Errors,
    Promise,
    _
) {
    /**
     *
     * @param {Object} logger
     * @param {Object} options
     * @param {Object} context
     * @param {String} taskId
     * @param {String} subscriptionMethodName
     * @param {[String]} subscriptionArgs
     * @constructor
     */
    var logger = Logger.initialize(powerStatusAlertJobFactory);

    function PowerStatusAlertJob(options, context, taskId) {

        PowerStatusAlertJob.super_.call(this, logger, options, context, taskId);

        this.routingKey = this.context.graphId;
        assert.uuid(this.routingKey);
   
        this.cachedPowerState = {};
    }
    util.inherits(PowerStatusAlertJob, BaseJob);

    /**
     * @memberOf PollerAlertJob
     */
    PowerStatusAlertJob.prototype._run = function run() {
	var self = this;
        
        self._subscribeIpmiCommandResult(
	    self.routingKey,
	    'chassisPower',
	    self.determinePowerStatusAlert
	);

    }
    PowerStatusAlertJob.prototype.determinePowerStatusAlert = function(){
        var self = this;
	self.powerStateAlerter(data.chassisPower.status, data);
    }
    

    PowerStatusAlertJob.prototype.powerStateAlerter = Promise.method(function(powerStatus, data) {
        var self = this;
        var tmp = {};
        tmp.type = 'polleralert';
        tmp.action = 'chassispower.updated';
        tmp.typeId = data.workItemId;
        tmp.nodeId = data.node;
        tmp.severity = "information";
        tmp.data = {
            states: {
		last: self.cachedPowerState[data.workItemId],
		current: powerStatus
            }
        };

        if(self.cachedPowerState[data.workItemId] !== powerStatus) {
            self._publishPollerAlert(tmp);
            self.cachedPowerState[data.workItemId] = powerStatus;
        }
        return powerStatus;
    });
 
  return PowerStatusAlertJob;

}
