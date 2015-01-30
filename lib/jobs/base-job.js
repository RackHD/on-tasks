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
        this._run();
        return this;
    };

    BaseJob.prototype.cancel = function cancel() {
        this.logger.info("Canceling job.", {
            taskId: this.taskId,
            name: this.constructor.name
        });
        this._done();
    };

    BaseJob.prototype._done = function _done() {
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
            self.emit('done');
            self.removeAllListeners();
        })
        .catch(function(e) {
            self.logger.error("Error canceling Job.", {
                error: e,
                taskId: self.taskId
            });
            self.emit('fail', e);
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

    BaseJob.prototype._subscribeRequestProfile = function _subscribeRequestProfile(callback) {
        var self = this;
        assert.func(callback);
        assert.isMongoId(self.nodeId);
        var deferred = taskProtocol.subscribeRequestProfile(self.nodeId, callback.bind(self));
        self.subscriptionPromises.push(deferred);
        deferred.then(function(subscription) {
            self.subscriptions.push(subscription);
        });
    };

    BaseJob.prototype._subscribeRequestProperties = function _subscribeRequestProperties(callback) {
        var self = this;
        assert.func(callback);
        assert.isMongoId(self.nodeId);
        var deferred = taskProtocol.subscribeRequestProperties(self.nodeId, callback.bind(self));
        self.subscriptionPromises.push(deferred);
        deferred.then(function(subscription) {
            self.subscriptions.push(subscription);
        });
    };

    BaseJob.prototype._subscribeRespondCommands = function _subscribeRespondCommands(callback) {
        var self = this;
        assert.func(callback);
        assert.isMongoId(self.nodeId);
        var deferred = taskProtocol.subscribeRespondCommands(self.nodeId, callback.bind(self));
        self.subscriptionPromises.push(deferred);
        deferred.then(function(subscription) {
            self.subscriptions.push(subscription);
        });
    };

    BaseJob.prototype._subscribeRequestCommands = function _subscribeRequestCommands(callback) {
        var self = this;
        assert.func(callback);
        assert.isMongoId(self.nodeId);
        var deferred = taskProtocol.subscribeRequestCommands(self.nodeId, callback.bind(self));
        self.subscriptionPromises.push(deferred);
        deferred.then(function(subscription) {
            self.subscriptions.push(subscription);
        });
    };

    BaseJob.prototype._subscribeHttpResponse = function subscribeHttpResponse(callback) {
        var self = this;
        assert.func(callback);
        assert.isMongoId(self.nodeId);
        var deferred = eventsProtocol.subscribeHttpResponse(self.nodeId, callback.bind(self));
        self.subscriptionPromises.push(deferred);
        deferred.then(function(subscription) {
            self.subscriptions.push(subscription);
        });
    };

    return BaseJob;
}
