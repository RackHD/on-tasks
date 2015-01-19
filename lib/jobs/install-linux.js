// Copyright 2014, Renasar Technologies Inc.
/* jshint: node:true */

'use strict';

var di = require('di'),
    events = require('events');

module.exports = installLinuxJobFactory;
di.annotate(installLinuxJobFactory, new di.Provide('Job.Linux.Install'));
    di.annotate(installLinuxJobFactory,
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
function installLinuxJobFactory(taskProtocol, eventsProtocol, Logger, assert, util, Q, _) {
    var logger = Logger.initialize(installLinuxJobFactory);

    /**
     *
     * @param {Object} options
     * @param {Object} context
     * @constructor
     */
    function InstallLinuxJob(options, context) {
        assert.object(options);
        assert.object(context);
        assert.string(context.target);
        assert.string(options.username);
        assert.string(options.hostname);
        assert.string(options.completionUri);
        assert.string(options.profile);

        this.options = options;
        this.nodeId = context.target;
        this.subscriptions = [];
        this.profile = this.options.profile;
        this.osProperties = {
            username: this.options.username,
            password: this.options.password,
            uid: this.options.uid,
            hostname: this.options.hostname,
            domain: this.options.domain
        };
    }
    util.inherits(InstallLinuxJob, events.EventEmitter);

    /**
     * @memberOf InstallLinuxJob
     * @returns {Q.Promise}
     */
    InstallLinuxJob.prototype.run = function() {
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

    InstallLinuxJob.prototype.stop = function() {
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
     * @memberOf InstallLinuxJob
     * @returns {Q.Promise}
     */
    InstallLinuxJob.prototype.cancel = function() {
        logger.info("Canceling install linux job.", {
            id: this.nodeId
        });
        return this.stop();
    };

    /**
     * @memberOf InstallLinuxJob
     * @returns InstallLinuxJob
     */
    InstallLinuxJob.create = function(options, context) {
        return new InstallLinuxJob(options, context);
    };

    return InstallLinuxJob;
}
