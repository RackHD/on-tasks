// Copyright 2015, EMC
/* jshint: node:true */

'use strict';

var di = require('di');

module.exports = pollerMessageCacheJobFactory;
di.annotate(pollerMessageCacheJobFactory, new di.Provide('Job.Message.Cache'));
di.annotate(pollerMessageCacheJobFactory, new di.Inject(
    'Job.Base',
    'Logger',
    'Util',
    'Assert',
    'Errors',
    'Promise',
    '_'
));
function pollerMessageCacheJobFactory(BaseJob, Logger, util, assert, Errors, Promise, _) {
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

        this.maxCacheSize = 150;
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

        _.forEach(['sdr', 'power', 'sel'], function(command) {
            self._subscribeIpmiCommandResult(
                self.routingKey,
                command,
                self.createSetIpmiCommandResultCallback(command)
            );
        });

        self._subscribeSnmpCommandResult(self.routingKey, self.setSnmpCommandResultCallback);

        self._subscribeRequestPollerCache(self.requestPollerCacheCallback);
    };

    /**
     * @memberOf PollerMessageCacheJob
     */
    PollerMessageCacheJob.prototype.createSetIpmiCommandResultCallback = function(command) {
        return function(data) {
            this.cacheSet(data.workItemId || 'unknown.' + command, _.omit(data, 'workItemId'));
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
    PollerMessageCacheJob.prototype.requestPollerCacheCallback = function(workItemId) {
        if (!this.cacheHas(workItemId)) {
            return Promise.reject(new Errors.NotFoundError(
                ("There is no cache record for the poller with ID %s." +
                "Perhaps it has not been run yet?").format(workItemId)));
        }
        return Promise.resolve(this.cacheGet(workItemId) || []);
    };

    return PollerMessageCacheJob;
}
