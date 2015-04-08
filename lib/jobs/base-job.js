// Copyright 2014, Renasar Technologies Inc.
/* jshint: node:true */

'use strict';

var di = require('di');

module.exports = baseJobFactory;
di.annotate(baseJobFactory, new di.Provide('Job.Base'));
    di.annotate(baseJobFactory,
    new di.Inject(
        'Protocol.Events',
        'Protocol.Task',
        'Assert',
        'Util',
        'Promise',
        '_'
    )
);
function baseJobFactory(eventsProtocol, taskProtocol, assert, util, Promise, _) {

    function BaseJob(logger, options, context, taskId) {
        var self = this;
        assert.func(self._run);

        assert.object(logger);
        assert.uuid(taskId);
        assert.object(options);
        assert.object(context);

        self.subscriptions = [];
        self.subscriptionPromises = [];

        self.logger = logger;
        self.options = options;
        self.context = context;
        self.taskId = taskId;

        self._deferred = new Promise(function(resolve, reject) {
            self.resolve = resolve;
            self.reject = reject;
        });
    }

    BaseJob.prototype.isPending = function isPending() {
        return this._deferred.isPending();
    };

    BaseJob.prototype.runWrapper = function runWrapper() {
        var self = this;

        function before() {
            if (self.context.target) {
                return self._subscribeActiveTaskExists(function() {
                    return self.serialize();
                });
            } else {
                return Promise.resolve();
            }
        }

        return before().disposer(function() {
            // Handle resolution of created subscriptions in the case we cancel
            // while still initializing
            return Promise.all(self.subscriptionPromises)
            .then(function() {
                return Promise.all(_.map(self.subscriptions, function(subscription) {
                    return subscription.dispose();
                }));
            });
        });
    };

    BaseJob.prototype.run = function run() {
        var self = this;

        return Promise.using(self.runWrapper(), function() {
            self.logger.silly("Running job.", {
                id: self.nodeId,
                module: self.logger.module,
                name: self.constructor.name,
                options: self.options,
                taskId: self.taskId,
                target: self.context.target || 'none'
            });

            self._run();
            return self._deferred;
        });
    };

    BaseJob.prototype.cancel = function cancel(error) {
        var loggerObject = {
            taskId: this.taskId,
            name: this.constructor.name
        };
        if (error) {
            loggerObject.error = error;
        }
        this.logger.info("Cancelling job.", loggerObject);
        this._done(error);
    };

    BaseJob.prototype._done = function _done(error) {
        if (this._deferred.isPending()) {
            if (error) {
                this.reject(error);
            } else {
                this.resolve();
            }
        } else {
            var msg = "Attempted to resolve job._deferred more than once. " +
                      "This is likely because it was cancelled and finished at the same time.";
            this.logger.warning(msg, {
                taskId: this.taskId,
                name: this.constructor.name
            });
        }
    };

    // enables JSON.stringify(this)
    BaseJob.prototype.toJSON = function toJSON() {
        return this.serialize();
    };

    BaseJob.prototype.serialize = function serialize() {
        var redactKeys = ['subscriptions' ,'subscriptionPromises', 'logger', '_deferred'];
        return _.transform(this, function(result, v, k) {
            if (!_.contains(redactKeys, k)) {
                result[k] = v;
            }
        }, {});
    };

    BaseJob.prototype._subscribeActiveTaskExists = function _subscribeActiveTaskExists(callback) {
        var self = this;
        assert.func(callback);
        assert.string(self.context.target);
        var deferred = taskProtocol.subscribeActiveTaskExists(
                self.context.target, callback.bind(self));
        self.subscriptionPromises.push(deferred);
        return deferred.then(function(subscription) {
            self.subscriptions.push(subscription);
        });
    };

    BaseJob.prototype._subscribeRequestProfile = function _subscribeRequestProfile(callback) {
        var self = this;
        assert.isMongoId(self.nodeId);
        var deferred = taskProtocol.subscribeRequestProfile(self.nodeId, callback.bind(self));
        self.subscriptionPromises.push(deferred);
        return deferred.then(function(subscription) {
            self.subscriptions.push(subscription);
        });
    };

    BaseJob.prototype._subscribeRequestProperties = function _subscribeRequestProperties(callback) {
        var self = this;
        assert.isMongoId(self.nodeId);
        var deferred = taskProtocol.subscribeRequestProperties(self.nodeId, callback.bind(self));
        self.subscriptionPromises.push(deferred);
        return deferred.then(function(subscription) {
            self.subscriptions.push(subscription);
        });
    };

    BaseJob.prototype._subscribeRespondCommands = function _subscribeRespondCommands(callback) {
        var self = this;
        assert.isMongoId(self.nodeId);
        var deferred = taskProtocol.subscribeRespondCommands(self.nodeId, callback.bind(self));
        self.subscriptionPromises.push(deferred);
        return deferred.then(function(subscription) {
            self.subscriptions.push(subscription);
        });
    };

    BaseJob.prototype._subscribeRequestCommands = function _subscribeRequestCommands(callback) {
        var self = this;
        assert.isMongoId(self.nodeId);
        var deferred = taskProtocol.subscribeRequestCommands(self.nodeId, callback.bind(self));
        self.subscriptionPromises.push(deferred);
        deferred.then(function(subscription) {
            self.subscriptions.push(subscription);
        });
    };

    BaseJob.prototype._subscribeHttpResponse = function _subscribeHttpResponse(callback) {
        var self = this;
        assert.isMongoId(self.nodeId);
        var deferred = eventsProtocol.subscribeHttpResponse(self.nodeId, callback.bind(self));
        self.subscriptionPromises.push(deferred);
        return deferred.then(function(subscription) {
            self.subscriptions.push(subscription);
        });
    };

    BaseJob.prototype._subscribeGraphFinished = function _subscribeGraphFinished(callback) {
        var self = this;
        assert.func(callback);
        assert.uuid(self.graphId);
        var deferred = eventsProtocol.subscribeGraphFinished(self.graphId, callback.bind(self));
        self.subscriptionPromises.push(deferred);
        return deferred.then(function(subscription) {
            self.subscriptions.push(subscription);
        });
    };

    BaseJob.prototype._publishSnmpCommandResult =
        function _publishSnmpCommandResult(uuid, data) {

        return taskProtocol.publishSnmpCommandResult(uuid, data);
    };

    BaseJob.prototype._subscribeSnmpCommandResult =
        function _subscribeSnmpCommandResult(uuid, callback) {

        var self = this;

        var deferred = taskProtocol.subscribeSnmpCommandResult(uuid, callback.bind(self));
        self.subscriptionPromises.push(deferred);
        return deferred.then(function(subscription) {
            self.subscriptions.push(subscription);
        });
    };

    BaseJob.prototype._subscribeRunSnmpCommand = function _subscribeRunSnmpCommand(uuid, callback) {
        var self = this;

        var deferred = taskProtocol.subscribeRunSnmpCommand(uuid, callback.bind(self));
        self.subscriptionPromises.push(deferred);
        return deferred.then(function(subscription) {
            self.subscriptions.push(subscription);
        });
    };

    BaseJob.prototype._publishRunSnmpCommand = function _publishRunSnmpCommand(uuid, hostData) {
        return taskProtocol.publishRunSnmpCommand(uuid, hostData);
    };

    BaseJob.prototype._publishIpmiCommandResult =
        function _publishIpmiCommandResult(uuid, command, data) {

        return taskProtocol.publishIpmiCommandResult(uuid, command, data);
    };

    BaseJob.prototype._subscribeIpmiCommandResult =
        function _subscribeIpmiCommandResult(uuid, command, callback) {

        var self = this;

        var deferred = taskProtocol.subscribeIpmiCommandResult(uuid, command,
                callback.bind(self));
        self.subscriptionPromises.push(deferred);
        return deferred.then(function(subscription) {
            self.subscriptions.push(subscription);
        });
    };

    BaseJob.prototype._subscribeRunIpmiCommand =
        function _subscribeRunIpmiCommand(uuid, command, callback) {

        var self = this;

        var deferred = taskProtocol.subscribeRunIpmiCommand(uuid, command,
                callback.bind(self));
        self.subscriptionPromises.push(deferred);
        return deferred.then(function(subscription) {
            self.subscriptions.push(subscription);
        });
    };

    BaseJob.prototype._publishRunIpmiCommand =
        function _publishRunIpmiCommand(uuid, command, machine) {

        taskProtocol.publishRunIpmiCommand(uuid, command, machine);
    };

    BaseJob.prototype._publishPollerAlert = function _publishPollerAlert(id, data) {
        taskProtocol.publishPollerAlert(id, data);
    };

    BaseJob.prototype._subscribeRequestPollerCache =
        function _subscribeRequestPollerCache(callback) {

        var self = this;

        var deferred = taskProtocol.subscribeRequestPollerCache(callback.bind(self));
        self.subscriptionPromises.push(deferred);
        deferred.then(function(subscription) {
            self.subscriptions.push(subscription);
        });
    };

    BaseJob.prototype._subscribeGetBootProfile = function _subscribeGetBootProfile(callback) {
        var self = this;
        assert.isMongoId(self.nodeId);
        assert.func(callback);
        var deferred = taskProtocol.subscribeGetBootProfile(self.nodeId, callback.bind(self));
        self.subscriptionPromises.push(deferred);
        deferred.then(function(subscription) {
            self.subscriptions.push(subscription);
        });
    };

    return BaseJob;
}
