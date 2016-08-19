// Copyright 2015, EMC, Inc.

'use strict';

var di = require('di');

module.exports = pollerMessageCacheJobFactory;
di.annotate(pollerMessageCacheJobFactory, new di.Provide('Job.Message.Cache'));
di.annotate(pollerMessageCacheJobFactory, new di.Inject(
    'Job.Base',
    'Services.Configuration',
    'Logger',
    'Util',
    'Assert',
    'Errors',
    'Promise',
    '_'
));
function pollerMessageCacheJobFactory(
    BaseJob,
    configuration,
    Logger,
    util,
    assert,
    Errors,
    Promise,
    _
) {
    var logger = Logger.initialize(pollerMessageCacheJobFactory);

    /**
     * @param {Object} options
     * @param {Object} context
     * @param {String} taskId
     * @constructor
     */
    function PollerMessageCacheJob(options, context, taskId) {
        PollerMessageCacheJob.super_.call(this, logger, options, context, taskId);

        this.routingKey = context.graphId;
        assert.uuid(this.routingKey) ;

        this.maxCacheSize = configuration.get('pollerCacheSize', 10);
        this.cache = {};
    }
    util.inherits(PollerMessageCacheJob, BaseJob);

    /**
     * @memberOf PollerMessageCacheJob
     */
    PollerMessageCacheJob.prototype.cacheSet = function(id, data) {
        if (!data) {
            return;
        }
        var cache = this.cache[id];
        if (!cache) {
            cache = [];
            this.cache[id] = cache;
        }
        data.timestamp = Date();
        cache.push(data);
        if (cache.length > this.maxCacheSize) {
            cache.shift();
        }
    };

    /**
     * @memberOf PollerMessageCacheJob
     */
    PollerMessageCacheJob.prototype.cacheGet = function(id) {
        return this.cache[id];
    };

    /**
     * @memberOf PollerMessageCacheJob
     */
    PollerMessageCacheJob.prototype.cacheHas = function(id) {
        return _.has(this.cache, id);
    };

    /**
     * @memberOf PollerMessageCacheJob
     */
    PollerMessageCacheJob.prototype._run = function run() {
        // NOTE: this job will run indefinitely absent user intervention
        var self = this;

        _.forEach(['sdr', 'selInformation', 'sel', 'chassis', 'driveHealth'], function(command) {
            self._subscribeIpmiCommandResult(
                self.routingKey,
                command,
                self.createSetIpmiCommandResultCallback(command)
            );
        });
        _.forEach(['power', 
                   'thermal', 
                   'systems.logservices', 
                   'managers.logservices',
                   'fabricservice',
                   'elements.thermal',
                   'elements.power',
                   'spine.thermal',
                   'spine.power',
                   'aggregator.thermal',
                   'aggregator.power'],
            function(command) {
            self._subscribeRedfishCommandResult(
                self.routingKey, 
                command, 
                self.createSetRedfishCommandResultCallback(command)
            );
        });
        self._subscribeMetricResult(self.routingKey, '*', self.setMetricResultCallback);
        self._subscribeSnmpCommandResult(self.routingKey, self.setSnmpCommandResultCallback);
        self._subscribeRequestPollerCache(self.requestPollerCacheCallback);
    };

    /**
     * @memberOf PollerMessageCacheJob
     */
    PollerMessageCacheJob.prototype.createSetIpmiCommandResultCallback = function(command) {
        var self = this;
        return function(data) {
            self.cacheSet(data.workItemId || 'unknown.ipmi.' + command, _.omit(data, 'workItemId'));
        };
    };
    
    /**
     * @memberOf PollerMessageCacheJob
     */
    PollerMessageCacheJob.prototype.createSetRedfishCommandResultCallback = function(command) {
        var self = this;
        return function(data) {
            self.cacheSet(
                data.workItemId || 'unknown.redfish.' + command,
                _.omit(data, 'workItemId'
            ));
        };
    };    

    /**
     * @memberOf PollerMessageCacheJob
     */
    PollerMessageCacheJob.prototype.setSnmpCommandResultCallback = function(data) {
        this.cacheSet(data.workItemId || 'unknown.snmp', _.omit(data, 'workItemId'));
    };

    /**
     * @memberOf PollerMessageCacheJob
     */
    PollerMessageCacheJob.prototype.setMetricResultCallback = function(data, metricName) {
        this.cacheSet(
            data.workItemId || 'unknown.metric.' + metricName,
            _.omit(data, 'workItemId')
        );
    };

    /**
     * @memberOf PollerMessageCacheJob
     */
    PollerMessageCacheJob.prototype.requestPollerCacheCallback = function(workItemId, options) {
        if (!this.cacheHas(workItemId)) {
            return Promise.reject(new Errors.NotFoundError(
                ("There is no cache record for the poller with ID %s." +
                "Perhaps it has not been run yet?").format(workItemId)));
        }
        var cache = this.cacheGet(workItemId) || [];
        if (options && options.latestOnly) {
            return Promise.resolve([cache[cache.length-1]] || []);
        } else {
            return Promise.resolve(cache);
        }
    };

    return PollerMessageCacheJob;
}
