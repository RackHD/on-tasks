// Copyright 2014, Renasar Technologies Inc.
/* jshint: node:true */

'use strict';

var di = require('di'),
    events = require('events');

module.exports = bootstrapLinuxJobFactory;
di.annotate(bootstrapLinuxJobFactory, new di.Provide('Task.Job.Linux.Bootstrapper'));
    di.annotate(bootstrapLinuxJobFactory,
    new di.Inject(
        'Job.Utils',
        'Protocol.Http',
        'Logger',
        'Assert',
        'Util',
        'Q',
        '_'
    )
);
function bootstrapLinuxJobFactory(utils, httpProtocol, Logger, util, assert, Q, _) {
    var logger = Logger.initialize(bootstrapLinuxJobFactory);

    /**
     *
     * @param {Object} options
     * @constructor
     */
    function BootstrapLinuxJob(options) {
        assert.object(options);
        assert.string(options.kernelversion);
        assert.string(options.kernel);
        assert.string(options.initrd);
        assert.string(options.basefs);
        assert.string(options.overlayfs);

        this.options = options;
        this.bootProperties = {
            kernelversion: this.options.kernelversion,
            kernel: this.options.kernel,
            initrd: this.options.initrd,
            basefs: this.options.basefs,
            overlayfs: this.options.overlayfs
        };
        this.nodeId = this.options.target;
        this.subscriptions = [];
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

        httpProtocol.subscribeRequestProperties(self.nodeId, function() {
            return self.bootProperties;
        }).then(function(subscription) {
            self.subscriptions.push(subscription);
            return httpProtocol.subscribeCommandRequest(self.nodeId, function() {
                    return {
                        identifier: this.nodeId,
                        tasks: [{ cmd: '' }]
                    };
                }.bind(self)
            );
        }).then(function(subscription) {
            self.subscriptions.push(subscription);
            return httpProtocol.subscribeCommandResponse(self.nodeId, function() {
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

    return BootstrapLinuxJob;
}
