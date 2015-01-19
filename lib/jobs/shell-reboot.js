// Copyright 2014, Renasar Technologies Inc.
/* jshint: node:true */

'use strict';

var di = require('di'),
    events = require('events');

module.exports = shellRebootJobFactory;
di.annotate(shellRebootJobFactory, new di.Provide('Job.Linux.ShellReboot'));
    di.annotate(shellRebootJobFactory,
    new di.Inject(
        'Protocol.Task',
        'Logger',
        'Assert',
        'Util',
        'Q',
        '_'
    )
);
function shellRebootJobFactory(taskProtocol, Logger, assert, util, Q, _) {
    var logger = Logger.initialize(shellRebootJobFactory);

    /**
     *
     * @param {Object} options
     * @constructor
     */
    function ShellRebootJob(options, context) {
        assert.object(options);
        assert.object(context);
        assert.string(context.target);
        assert.number(options.rebootCode);

        this.options = options;
        this.nodeId = context.target;
        this.subscriptions = [];
    }
    util.inherits(ShellRebootJob, events.EventEmitter);

    /**
     * @memberOf ShellRebootJob
     * @returns {Q.Promise}
     */
    ShellRebootJob.prototype.run = function() {
        var self = this,
            deferred = Q.defer();

        logger.info("Running shell reboot job.", {
            id: this.nodeId
        });

        taskProtocol.subscribeRequestCommands(self.nodeId, function() {
                logger.debug("Received command request from node. Telling it to reboot.", {
                    id: self.nodeId
                });
                self.emit('done');
                return {
                    identifier: self.nodeId,
                    tasks: [ { cmd: '' } ],
                    exit: this.options.rebootCode
                };
            }.bind(self)
        ).then(function(subscription) {
            self.subscriptions.push(subscription);
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
            this.removeAllListeners();
            Q.all(_.map(self.subscriptions, function(subscription) {
                return subscription.dispose();
            })).catch(function(e) {
                logger.error("Error removing job subscriptions.", {
                    id: self.nodeId,
                    error: e,
                    context: self.context
                });
            });
            deferred.resolve();
        });

        return deferred.promise;
    };

    /**
     * @memberOf ShellRebootJob
     * @returns {Q.Promise}
     */
    ShellRebootJob.prototype.cancel = function() {
        logger.info("Cancelling shell reboot job.", {
            id: this.nodeId
        });
        this.removeAllListeners();
        return Q.all(_.map(this.subscriptions, function(subscription) {
            return subscription.dispose();
        }));
    };

    /**
     * @memberOf ShellRebootJob
     * @returns ShellRebootJob
     */
    ShellRebootJob.create = function(options, context) {
        return new ShellRebootJob(options, context);
    };

    return ShellRebootJob;
}
