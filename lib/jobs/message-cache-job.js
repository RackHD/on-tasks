// Copyright 2014-2015, Renasar Technologies Inc.
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
    'Q',
    '_'
));
function pollerMessageCacheJobFactory(BaseJob, Logger, util, assert, Q, _) {
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

    PollerMessageCacheJob.prototype.cacheGet = function(id) {
        return this.cache[id];
    };

    PollerMessageCacheJob.prototype.cacheHas = function(id) {
        return _.has(this.cache, id);
    };

    /**
     * @memberOf PollerAlertJob
     */
    PollerMessageCacheJob.prototype._run = function run() {
        // NOTE: this job will run indefinitely absent user intervention
        var self = this;

        _.forEach(['sdr', 'power', 'sel'], function(command) {
            self._subscribeIpmiCommandResult(self.routingKey, command, function(data) {
                self.cacheSet(data.workItemId || 'unknown.' + command, _.omit(data, 'workItemId'));
            });
        });

        self._subscribeSnmpCommandResult(self.routingKey, function(data) {
            self.cacheSet(data.workItemId || 'unknown.snmp', _.omit(data, 'workItemId'));
        });

        self._subscribeRequestPollerCache(function(workItemId) {
            if (!self.cacheHas(workItemId)) {
                return Q.reject(new Error("Work Item does not exist in cache"));
            }
            return Q.resolve(self.cacheGet(workItemId));
        });
    };

    return PollerMessageCacheJob;
}
