// Copyright 2014, Renasar Technologies Inc.
/* jshint: node:true */

'use strict';

var di = require('di'),
    events = require('events');

module.exports = installOsJobFactory;
di.annotate(installOsJobFactory, new di.Provide('Job.Os.Install'));
    di.annotate(installOsJobFactory,
    new di.Inject(
        'Protocol.Task',
        'Protocol.Events',
        'Logger',
        'Assert',
        'Util',
        'Q',
        '_'
    )
);
function installOsJobFactory(taskProtocol, eventsProtocol, Logger, assert, util, Q, _) {
    var logger = Logger.initialize(installOsJobFactory);

    /**
     *
     * @param {Object} options
     * @param {Object} context
     * @constructor
     */
    function InstallOsJob(options, context, taskId) {
        var self = this;

        assert.object(options);
        assert.object(context);
        assert.uuid(taskId);
        assert.string(context.target);
        assert.string(options.completionUri);
        assert.string(options.profile);

        self.options = options;
        self.taskId = taskId;
        self.nodeId = context.target;
        self.subscriptions = [];
        self.profile = self.options.profile;
        self.osProperties = {};
        // All potential properties used by linux and esx installers
        var validProperties = ['username',
                                'password',
                                'uid',
                                'hostname',
                                'domain',
                                'esxBootConfigTemplate'];
        _.forEach(validProperties, function(prop) {
            if (_.has(self.options, prop)) {
                self.osProperties[prop] = self.options[prop];
            }
        });
    }
    util.inherits(InstallOsJob, events.EventEmitter);

    /**
     * @memberOf InstallOsJob
     * @returns {Q.Promise}
     */
    InstallOsJob.prototype.run = function() {
        var self = this,
            deferred = Q.defer();

        logger.info("Running install os job.", {
            id: this.nodeId,
            options: this.options
        });

        taskProtocol.subscribeRequestProfile(self.nodeId, function() {
                return this.profile;
            }.bind(self)
        ).then(function(subscription) {
            self.subscriptions.push(subscription);
            return taskProtocol.subscribeRequestProperties(self.nodeId, function() {
                    return self.osProperties;
                }.bind(self)
            );
        }).then(function(subscription) {
            self.subscriptions.push(subscription);
            return eventsProtocol.subscribeHttpResponse(self.nodeId, function(data) {
                assert.object(data);
                if (199 < data.statusCode && data.statusCode < 300) {
                    if(_.contains(data.url, self.options.completionUri)) {
                        self.emit('done');
                    }
                }
            });
        }).then(function(subscription) {
            self.subscriptions.push(subscription);
        }).catch(function(error) {
            self.stop().catch(function(error) {
                logger.error("Error removing subscriptions on job failure.", {
                    id: self.nodeId,
                    error: error
                });
            });

            deferred.reject(error);
        });

        this.on('done', function() {
            self.stop();
            deferred.resolve();
        });

        return deferred.promise;
    };

    InstallOsJob.prototype.stop = function() {
        var self = this;
        this.removeAllListeners();
        return Q.all(_.map(this.subscriptions, function(subscription) {
            return subscription.dispose();
        })).catch(function(error) {
            logger.error("Error removing job subscriptions.", {
                id: self.nodeId,
                error: error,
                context: self.context
            });
        });
    };

    /**
     * @memberOf InstallOsJob
     * @returns {Q.Promise}
     */
    InstallOsJob.prototype.cancel = function() {
        logger.info("Canceling install os job.", {
            id: this.nodeId
        });
        return this.stop();
    };

    /**
     * @memberOf InstallOsJob
     * @returns InstallOsJob
     */
    InstallOsJob.create = function(options, context, taskId) {
        return new InstallOsJob(options, context, taskId);
    };

    return InstallOsJob;
}
