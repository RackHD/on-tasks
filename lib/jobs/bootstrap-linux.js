// Copyright 2014, Renasar Technologies Inc.
/* jshint: node:true */

'use strict';

var di = require('di'),
    events = require('events');

module.exports = bootstrapLinuxJobFactory;
di.annotate(bootstrapLinuxJobFactory, new di.Provide('Job.Linux.Bootstrap'));
    di.annotate(bootstrapLinuxJobFactory,
    new di.Inject(
        'Protocol.Task',
        'Logger',
        'Assert',
        'Util',
        'Q',
        '_'
    )
);
function bootstrapLinuxJobFactory(taskProtocol, Logger, assert, util, Q, _) {
    var logger = Logger.initialize(bootstrapLinuxJobFactory);

    /**
     *
     * @param {Object} options
     * @constructor
     */
    function BootstrapLinuxJob(options, context) {
        assert.object(options);
        assert.object(context);
        assert.string(context.target);
        assert.string(options.kernelversion);
        assert.string(options.kernel);
        assert.string(options.initrd);
        assert.string(options.basefs);
        assert.string(options.overlayfs);

        this.options = options;
        this.nodeId = context.target;
        this.subscriptions = [];
        this.profile = this.options.profile;
        this.bootProperties = {
            kernelversion: this.options.kernelversion,
            kernel: this.options.kernel,
            initrd: this.options.initrd,
            basefs: this.options.basefs,
            overlayfs: this.options.overlayfs
        };
    }
    util.inherits(BootstrapLinuxJob, events.EventEmitter);

    /**
     * @memberOf BootstrapLinuxJob
     * @returns {Q.Promise}
     */
    BootstrapLinuxJob.prototype.run = function() {
        var self = this,
            deferred = Q.defer();

        logger.info("Running bootstrap linux job.", {
            id: this.nodeId
        });

        taskProtocol.subscribeRequestProfile(self.nodeId, function() {
                return this.profile;
            }.bind(self)
        ).then(function() {
            return taskProtocol.subscribeRequestProperties(self.nodeId, function() {
                    return this.bootProperties;
                }.bind(self)
            );
        }).then(function(subscription) {
            self.subscriptions.push(subscription);
            return taskProtocol.subscribeRequestCommands(self.nodeId, function() {
                    return {
                        identifier: this.nodeId,
                        tasks: [{ cmd: '' }]
                    };
                }.bind(self)
            );
        }).then(function(subscription) {
            self.subscriptions.push(subscription);
            return taskProtocol.subscribeRespondCommands(self.nodeId, function() {
                    logger.info("Node is online and waiting for tasks", {
                        id: this.nodeId
                    });
                    this.emit('done');
                }.bind(self)
            );
        }).catch(function(error) {
            Q.all(_.map(this.subscriptions, function(subscription) {
                return subscription.dispose();
            })).catch(function(error) {
                logger.error("Error removing subscriptions on job failure.", {
                    id: self.nodeId,
                    error: error
                });
            });

            deferred.reject(error);
        });

        this.on('done', function() {
            deferred.resolve();
        });

        return deferred.promise;
    };

    /**
     * @memberOf BootstrapLinuxJob
     * @returns {Q.Promise}
     */
    BootstrapLinuxJob.prototype.cancel = function() {
        logger.info("Canceling bootstrap linux job.", {
            id: this.options.target
        });
        return Q.all(_.map(this.subscriptions, function(subscription) {
            return subscription.dispose();
        }));
    };

    /**
     * @memberOf BootstrapLinuxJob
     * @returns BootstrapLinuxJob
     */
    BootstrapLinuxJob.create = function(options, context) {
        return new BootstrapLinuxJob(options, context);
    };

    return BootstrapLinuxJob;
}
