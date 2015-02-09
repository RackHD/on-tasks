// Copyright 2014, Renasar Technologies Inc.
/* jshint: node:true */

'use strict';

var di = require('di'),
    events = require('events');

module.exports = baseJobFactory;
di.annotate(baseJobFactory, new di.Provide('Job.Base'));
    di.annotate(baseJobFactory,
    new di.Inject(
        'Protocol.Events',
        'Protocol.Task',
        'Assert',
        'Util',
        'Q',
        '_'
    )
);
function baseJobFactory(eventsProtocol, taskProtocol, assert, util, Q, _) {

    function BaseJob(logger, options, context, taskId) {
        assert.func(this._run);

        assert.object(logger);
        assert.uuid(taskId);
        assert.object(options);
        assert.object(context);

        this.subscriptions = [];
        this.subscriptionPromises = [];

        this.logger = logger;
        this.options = options;
        this.context = context;
        this.taskId = taskId;
    }
    util.inherits(BaseJob, events.EventEmitter);

    BaseJob.prototype.run = function run() {
        var self = this;
        if (!self.context.target) {
            self._run();
            return Q.resolve(self);
        } else {
            return self._subscribeActiveTaskExists(function() {
                return self.serialize();
            })
            .then(function() {
                self._run();
                return self;
            })
            .catch(function(err) {
                self._done(err);
            });
        }
    };

    BaseJob.prototype.cancel = function cancel() {
        this.logger.info("Canceling job.", {
            taskId: this.taskId,
            name: this.constructor.name
        });
        this._done();
    };

    BaseJob.prototype._done = function _done(error) {
        var self = this;

        // Handle resolution of created subscriptions in the case we cancel
        // while still initializing
        Q.all(self.subscriptionPromises)
        .then(function() {
            return Q.all(_.map(self.subscriptions, function(subscription) {
                return subscription.dispose();
            }));
        })
        .then(function() {
            if (error) {
                self.emit('done', error);
            } else {
                self.emit('done');
            }
            self.removeAllListeners();
        })
        .catch(function(e) {
            self.logger.error("Error canceling Job.", {
                error: e,
                taskId: self.taskId
            });
            self.emit('done', e);
            self.removeAllListeners();
        });
    };

    // enables JSON.stringify(this)
    BaseJob.prototype.toJSON = function toJSON() {
        return this.serialize();
    };

    BaseJob.prototype.serialize = function serialize() {
        var json = _.cloneDeep(_(this).value());
        delete json.logger;
        delete json.subscriptions;
        delete json.subscriptionPromises;
        return json;
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
