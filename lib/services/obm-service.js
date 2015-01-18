// Copyright 2014-2015, Renasar Technologies Inc.
/* jshint node: true */


'use strict';

var di = require('di');

module.exports = obmServiceFactory;

di.annotate(obmServiceFactory, new di.Provide('Service.OBM'));
di.annotate(obmServiceFactory, new di.Inject('Q', '_', di.Injector, 'Assert',
    'Services.Waterline', 'Logger', 'Services.Configuration'));
function obmServiceFactory(Q, _, injector, assert, waterline, Logger, config) {

    var logger = Logger.initialize(obmServiceFactory);

    /**
     * An OBM command interface that runs raw OBM commands from
     * various OBM services with failure and retry logic.
     *
     * @constructor
     */
    function ObmService() {
    }

    /* An obmSetting object will look something like below. It
     * will be an array of OBM configurations which contain a DI
     * service name, and necessary configuration data:
     *  [
     *      {
     *          service: 'ipmi-obm-service',
     *          config: {
     *              'user': 'ADMIN',
     *              'password': 'ADMIN',
     *              'host': '192.168.100.12'
     *          }
     *      },
     *      {
     *          service: 'hms-obm-service',
     *          config: {
     *              'nodeIdentifier': 'N5'
     *          }
     *      }
     *  ]
     */

    /**
     * Iterates through an array of OBM configurations and instantiates
     * OBM service objects at runtime. On an OBM call failure it attemps
     * to try the next OBM service configuration in the array.
     *
     * @function _runObmCommand
     *
     * @param {Object[]} settings - array of OBM configuration objects
     * @param {String} obmCommand - function interface name to call
     * @param {String} nodeId - identifier for the node
     * @param {boolean} [childProcessFailure] - a stateful variable that
     * keeps track of whether any of our failures have been child process
     * related, or merely configuration/interface related. If no errors were
     * child process related, then we shouldn't retry the command.
     *
     * @returns {Promise}
     */
    ObmService.prototype._runObmCommand = function (settings,
                                                    obmCommand, nodeId, childProcessFailure) {
        var self = this;
        assert.array(settings);
        assert.string(obmCommand);
        assert.string(nodeId);

        if (_.isEmpty(settings)) {
            var error;
            if (childProcessFailure) {
                error = new Error("Could not find an OBM service to fulfill " +
                obmCommand + " request.");
                error.name = 'ObmServiceFailureError';
            } else {
                error = new Error("Could not find an OBM service that can implement the " +
                obmCommand + " request.");
                error.name = 'ObmConfigurationError';
            }
            throw error;
        }

        function next(_childProcessFailure) {
            return Q.delay().then(function () {
                return self._runObmCommand(settings, obmCommand, nodeId,
                    _childProcessFailure);
            });
        }

        var setting = settings.shift();
        assert.string(setting.service);
        assert.object(setting.config);

        //if (!_.contains(constants.VALID_OBM_SERVICES, setting.service)) {
        //    logger.warning("OBM service is not included in the " +
        //            "VALID_OBM_SERVICES list. Skipping");
        //    return next(childProcessFailure);
        //}

        var serviceFactory = injector.get(setting.service);

        if (!_.isFunction(serviceFactory)) {
            logger.warning("Could not inject a serviceFactory for " + setting.service);
            return next(childProcessFailure);
        }

        // instantiate the relevant OBM service (using the factory we just laoded)
        // with the config from setting.
        var service = serviceFactory(setting.config);
        // serviceFactory will return false and log an error if
        // the config object we pass in is invalid
        if (!service) {
            return next(childProcessFailure);
        }

        return service[obmCommand](nodeId)
            .then(function (out) {
                //TODO(heckj): re-enable to allow job to pass through a callback to kill this effort
                //self.registerKillCallback(workflowInstance, out.killSafe);
                logger.info("OBM command (" + obmCommand + ") success. Type: " + setting.service, {
                    identifier: nodeId
                });
                return out;
            })
            .catch(function (err) {
                if (err && err.name === 'ObmCommandNotImplementedError') {
                    logger.warning("Method " + obmCommand + " does not exist for " +
                    "obm service " + setting.service, {id: nodeId});
                    return next(childProcessFailure);
                }
                logger.warning("OBM service " + setting.service +
                    " failed to run " + obmCommand + " command.",
                    {
                        stack: err.stack,
                        id: nodeId
                    });
                // This is the only place where we set childProcessFailure to true
                return next(true);
            })
            .fin(function () {
                //self.unregisterKillCallback(workflowInstance);
            });
    };

    /**
     * Helper function that does a lookup on a node for its OBM configurations
     * and passes them into _runObmCommand
     *
     * @memberOf ObmService
     *
     * @function
     *
     * @param {String} nodeId - The identifier for the node
     * @param {String} obmCommand - an interface function name
     *
     * @returns {Q.Promise}
     */
    ObmService.prototype.runObmCommand = function (nodeId, obmCommand) {
        var self = this;
        return waterline.nodes.findByIdentifier(nodeId).then(function (node) {
            return self._runObmCommand(node.obmSettings, obmCommand, nodeId);
        });
    };

    /**
     * Attempts to run an OBM command a specified number of times until
     * success.
     *
     * @function retryObmCommand
     *
     * @param {Object} options optins for the retry
     * @param {String} options.nodeId - The identifier for the node
     * @param {String} options.obmCommand - an interface function name
     * @param {number} [options.delay] - amount of time (in ms) to delay in between retries
     * @param {number} [options.retries] - number of attempts to make
     * @param {*} [options.expected] - optional expected output to determine
     * success or not. Used primarily with powerStatus assertions.
     *
     * @returns {Q.Promise}
     */
    ObmService.prototype.retryObmCommand = function (options) {

        assert.object(options);

        var nodeId = options.nodeId;
        var obmCommand = options.obmCommand;
        var expected = options.expected;

        var self = this;
        var deferred = Q.defer();

        var delay = config.get('obmInitialDelay') || 500,
            retries = config.get('obmRetries') || 6;

        function obmLoop(times, delay) {
            // Max out exponential backoff to 60 seconds.
            delay = delay > 60000 ? 60000 : delay;

            if (times >= retries) {
                logger.error("Exceeded retries for " + obmCommand);
                // Avoid calling this twice if an external source
                // cancels the task and rejects the promise
                if (deferred.promise.isPending()) {
                    deferred.reject(new Error("Exceeded retries for " + obmCommand));
                }
                return;
            } else if (times !== 0) {
                logger.debug("Retrying " + obmCommand + " Attempt " + times + "...",
                    {id: nodeId});
            }

            self.runObmCommand(nodeId, obmCommand)
                .then(function (out) {
                    if (expected !== undefined && out !== expected) {
                        logger.debug("Expected power state " + expected +
                            " does not match actual state " + out +
                            ". Retrying power status, attempt " + times + "...",
                            {id: nodeId});
                        // delay * 2 gives us exponential backoff. This way speedy OBM
                        // services will still be relatively speedy, while slow OBM services
                        // will also be accomodated.
                        // 1 sec, 2 sec, 4 sec, 8 sec, 16 sec
                        var timer = setTimeout(function () {
                            obmLoop(times + 1, delay * 2);
                        }, delay * 2);
                    } else {
                        // Avoid calling this twice if an external source
                        // cancels the task and rejects the promise
                        if (deferred.promise.isPending()) {
                            deferred.resolve(out);
                        }
                        return;
                    }
                })
                .catch(function (error) {
                    if (error && (error.name === 'ObmCancellationError')) {
                        // Avoid calling this twice if an external source
                        // cancels the task and rejects the promise
                        if (deferred.promise.isPending()) {
                            deferred.reject(error);
                        }
                        return;
                    }
                    if (error && (error.name === 'ObmConfigurationError')) {
                        // Don't bother with retries if none of the OBM commands
                        // actually implement the setBootPxe command.
                        if (obmCommand === 'setBootPxe') {
                            logger.warning(error.message, {
                                id: nodeId
                            });
                            // Avoid calling this twice if an external source
                            // cancels the task and rejects the promise
                            if (deferred.promise.isPending()) {
                                deferred.resolve();
                            } else {
                                logger.warning("NOT IS PENDING");
                            }
                            return;
                        } else {
                            // Don't bother with retries if none of our failures
                            // are child process related, but rather configuration
                            // related.
                            // Avoid calling this twice if an external source
                            // cancels the task and rejects the promise
                            if (deferred.promise.isPending()) {
                                deferred.reject(error);
                            }
                            return;
                        }
                    }
                    logger.debug("Waiting " + delay + "ms before retrying " + obmCommand, {
                        id: nodeId
                    });
                    // delay * 2 gives us exponential backoff. This way speedy OBM
                    // services will still be relatively speedy, while slow OBM services
                    // will also be accomodated.
                    // 1 sec, 2 sec, 4 sec, 8 sec, 16 sec
                    var timer = setTimeout(function () {
                        obmLoop(times + 1, delay * 2);
                    }, delay);
                });
        }

        obmLoop(0, delay);

        return deferred.promise;
    };

    //ObmService.prototype.cancelObmTasks = function (nodeId, instance) {
    //    if (this.isActive(instance)) {
    //        logger.info("Cleaning up outstanding OBM tasks and timers.", {
    //            identifier: nodeId,
    //            instance: instance
    //        });
    //        if (_.isFunction(this.workflows[instance].clearTimer)) {
    //            this.workflows[instance].clearTimer();
    //        }
    //        if (_.isFunction(this.workflows[instance].clearDeferred)) {
    //            this.workflows[instance].clearDeferred();
    //        }
    //        if (_.isFunction(this.workflows[instance].killChildProcess)) {
    //            this.workflows[instance].killChildProcess();
    //        }
    //        delete this.workflows[instance];
    //    } else if (_.has(this.workflows, instance)) {
    //        delete this.workflows[instance];
    //    }
    //    return Q.resolve();
    //};
    //
    //ObmService.prototype.registerDeferred = function (instance, deferred) {
    //    this.workflows[instance] = this.workflows[instance] || {};
    //    this.workflows[instance].clearDeferred = function () {
    //        // Avoid calling this twice if the process resolves
    //        // or rejects the promise before cancellation completes.
    //        if (deferred.promise.isPending()) {
    //            deferred.reject(new Error("OBM task was cancelled"));
    //        }
    //    };
    //};
    //
    //ObmService.prototype.unregisterDeferred = function (instance) {
    //    if (this.workflows && this.workflows[instance]) {
    //        delete this.workflows[instance].clearDeferred;
    //    }
    //};
    //
    //ObmService.prototype.registerTimer = function (instance, timer) {
    //    this.workflows[instance] = this.workflows[instance] || {};
    //    this.workflows[instance].clearTimer = function () {
    //        clearTimeout(timer);
    //    };
    //};
    //
    //ObmService.prototype.unregisterTimer = function (instance) {
    //    if (this.workflows && this.workflows[instance]) {
    //        delete this.workflows[instance].clearTimer;
    //    }
    //};
    //
    //ObmService.prototype.registerKillCallback = function (instance, killCallback) {
    //    this.workflows[instance] = this.workflows[instance] || {};
    //    this.workflows[instance].killChildProcess = function () {
    //        // Defaults to SIGTERM
    //        // TODO: Check if process exited and if not try SIGKILL
    //        killCallback();
    //    };
    //};
    //
    //ObmService.prototype.unregisterKillCallback = function (instance) {
    //    if (this.isActive(instance)) {
    //        delete this.workflows[instance].killChildProcess;
    //    }
    //};

    /**
     * Takes an OBM on/off command and wraps it with status checks to
     * prevent idempotency failures from some OBM services, and to assert
     * that our power calls have actually happened.
     *
     * @memberOf ObmService
     * @function
     *
     * @param {String} nodeId - The identifier for the node
     * @param {String} obmCommand - an interface function name
     *
     * @returns {Q.Promise} - returns a promise fulfilled with the value of
     * the power status.
     */
    ObmService.prototype.wrapWithStatusCheck = function (nodeId, obmCommand, workflowInstance) {
        var self = this;
        // Decide whether we have to run the command or not
        return self.powerStatus(nodeId, workflowInstance)
            .then(function (on) {
                if ((on && obmCommand === 'powerOn') ||
                    (!on && obmCommand === 'powerOff')) {
                    // on here is either a true or false value.
                    return Q.resolve(on);
                } else {
                    // If we're not already in the desired state, run the command
                    return self.retryObmCommand({
                        nodeId: nodeId,
                        obmCommand: obmCommand,
                        workflowInstance: workflowInstance
                    })
                        .then(function () {
                            // Assert we've affected the power state.
                            if (obmCommand === 'powerOn') {
                                // return self.powerStatus(nodeId, true);
                                //
                                // Don't bother asserting power status after turning
                                // it on. Sometimes it takes too long (with AMT
                                // specifically) therefore causing race conditions
                                // with workflow states and
                                // properties.request template rendering.
                                // We can ascertain this information anyways when
                                // the node fails to come up.
                                return Q.resolve(true);
                            } else if (obmCommand === 'powerOff') {
                                // Give a little breathing room after the powerOff
                                // call before we assert the status.
                                return Q.delay(500)
                                    .then(function () {
                                        logger.info("Asserting power status is off. ", {
                                            identifier: nodeId
                                        });
                                        return self.powerStatus(nodeId, workflowInstance, false);
                                    });
                            } else {
                                logger.warning("ObmService.wrapWithStatusCheck should only be " +
                                "used with powerOn and powerOff commands.");
                                return Q.resolve();
                            }
                        });
                }
            });
    };

    /**
     * Power On interface.
     *
     * @memberOf ObmService
     * @function
     *
     * @param {String} nodeId
     * @returns {Q.Promise}
     */
    ObmService.prototype.powerOn = function (nodeId, workflowInstance) {
        return this.wrapWithStatusCheck(nodeId, 'powerOn', workflowInstance);
    };

    /**
     * Power Off interface.
     *
     * @memberOf ObmService
     * @function
     *
     * @param {String} nodeId
     * @returns {Q.Promise}
     */
    ObmService.prototype.powerOff = function (nodeId, workflowInstance) {
        return this.wrapWithStatusCheck(nodeId, 'powerOff', workflowInstance);
    };

    /**
     * Reboot interface.
     *
     * Overrides typical reboot functionality with a safer sequence
     * consisting of status checks, powering off, and powering on.
     *
     * @memberOf ObmService
     * @function
     *
     * @param {String} nodeId
     * @returns {Q.Promise}
     */
    ObmService.prototype.reboot = function (nodeId, workflowInstance) {
        var self = this;
        return self.powerOff(nodeId, workflowInstance)
            .then(function () {
                return self.powerOn(nodeId, workflowInstance);
            });
    };

    /**
     * Power Status interface.
     *
     * @memberOf ObmService
     * @function
     *
     * @param {String} nodeId
     * @param {boolean} [expected] on/off value used on internal calls to powerStatus
     * to assert that powerOn or powerOff calls have succeeded.
     *
     * @returns {Q.Promise}
     */
    ObmService.prototype.powerStatus = function (nodeId, workflowInstance, expected) {
        return this.retryObmCommand({
            nodeId: nodeId,
            obmCommand: 'powerStatus',
            workflowInstance: workflowInstance,
            expected: expected
        });
    };

    /**
     * Set the node to PXE boot on next boot. Not all OBM services will
     * implement this function.
     *
     * @memberOf ObmService
     * @function
     *
     * @param {String} nodeId
     * @returns {Q.Promise}
     */
    ObmService.prototype.setBootPxe = function (nodeId, workflowInstance) {
        // Delay less here since some OBM services
        // just won't have this call.
        return this.retryObmCommand({
            nodeId: nodeId,
            obmCommand: 'setBootPxe',
            workflowInstance: workflowInstance
        });
    };

    /**
     * Enable the identify light (on) for the node. Not all OBM services
     * will implement this function.
     *
     * @memberOf ObmService
     * @function
     *
     * @param {String} nodeId
     * @returns {Promise}
     */
    ObmService.prototype.identifyOn = function (nodeId) {
        return this.retryObmCommand({
            nodeId: nodeId,
            obmCommand: 'identifyOn'
        });
    };

    /**
     * Disable the identify light (off) for the node. Not all OBM services
     * will implement this function.
     *
     * @memberOf ObmService
     * @function
     *
     * @param {String} nodeId
     * @returns {Promise}
     */
    ObmService.prototype.identifyOff = function (nodeId) {
        return this.retryObmCommand({
            nodeId: nodeId,
            obmCommand: 'identifyOff'
        });
    };

    return new ObmService();
}

