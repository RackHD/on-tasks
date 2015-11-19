// Copyright 2015, EMC, Inc.

'use strict';

var di = require('di');

module.exports = obmServiceFactory;

di.annotate(obmServiceFactory, new di.Provide('Task.Services.OBM'));
di.annotate(obmServiceFactory, new di.Inject(
    'Promise',
    '_',
    di.Injector,
    'Assert',
    'Logger',
    'Services.Configuration',
    'Services.Lookup',
    'Constants',
    'Services.Encryption',
    'Services.Waterline',
    'Errors'
));

function obmServiceFactory(
    Promise,
    _,
    injector,
    assert,
    Logger,
    config,
    lookup,
    Constants,
    encryption,
    waterline,
    Errors
) {
    var logger = Logger.initialize(obmServiceFactory);

    function lookupHost (options) {
        if (options.config.host && Constants.Regex.MacAddress.test(options.config.host)) {
            return lookup.macAddressToIp(options.config.host).then(function (ipAddress) {
                options.config.host = ipAddress;
                return options;
            });
        }

        return options;
    }

    function revealSecrets (options) {
        if (options.config.password) {
            options.config.password = encryption.decrypt(options.config.password);
        }

        if (options.config.community) {
            options.config.community = encryption.decrypt(options.config.community);
        }

        return options;
    }

    /**
     * An OBM command interface that runs raw OBM commands from
     * various OBM services with failure and retry logic.
     *
     * @constructor
     */
    function ObmService(nodeId, obmServiceFactory, obmSettings, delay, retries) {
        assert.object(obmSettings);
        assert.object(obmSettings.config);
        assert.string(obmSettings.service);
        assert.func(obmServiceFactory);
        assert.isMongoId(nodeId);

        this.retries = retries;
        this.delay = delay;
        if (delay !== 0) {
            this.delay = delay || config.get('obmInitialDelay') || 500;
        }
        if (retries !== 0) {
            this.retries = retries || config.get('obmRetries') || 6;
        }

        this.serviceFactory = obmServiceFactory;
        this.obmConfig = obmSettings.config;
        this.serviceType = obmSettings.service;
        this.nodeId = nodeId;
    }

    ObmService.prototype.kill = function() {
        // This will propagate down to the child process object running the
        // command, which in turn will reject an error that gets propagated up
        // and caught by _runObmCommand
        if (this.service && _.isFunction(this.service.kill)) {
            this.service.kill();
        }
    };

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
     *          service: 'vbox-obm-service',
     *          config: {
     *              'alias': 'test-vm',
     *              'user': 'renasar'
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
    ObmService.prototype.runObmCommand = function (obmCommand) {
        var self = this;

        return Promise.resolve({
            delay: this.delay,
            retries: this.retries,
            config: this.obmConfig
        })
        .then(lookupHost)
        .then(revealSecrets)
        .then(function (options) {
            self.service = self.serviceFactory.create(options);
            return self.service[obmCommand](self.nodeId);
        });
    };

    /**
     * Attempts to run an OBM command a specified number of times until
     * success.
     *
     * @function _retryObmCommand
     *
     * @param {number} retryCount - Recursive counter for runObmCommand retry count
     * @param {String} nodeId - The identifier for the node
     * @param {String} obmCommand - an interface function name
     * @param {*} expected - optional expected output to determine
     * success or not. Used primarily with powerStatus assertions.
     * @param {number} delay - amount of time (in ms) to delay in between retries
     * @param {number} retries - number of attempts to make
     *
     * @returns {Promise}
     */
    ObmService.prototype._retryObmCommand = function(retryCount, obmCommand, expected, delay) {
        var self = this;

        return self.runObmCommand(obmCommand)
        .then(function(out) {
            if (expected !== undefined && out !== expected) {
                logger.debug("Expected power state " + expected +
                    " does not match actual state " + out +
                    ". Retrying power status, attempt " + retryCount + "...",
                    {id: self.nodeId});

                if (retryCount < self.retries) {
                    logger.debug("Retrying ObmService command.", {
                        id: self.nodeId,
                        obmCommand: obmCommand
                    });
                    return Promise.delay(delay)
                    .then(function() {
                        return self._retryObmCommand(
                            retryCount + 1, obmCommand, expected, delay * 2);
                    });
                } else {
                    throw new Error("Exceeded maximum retries for obmCommand to " +
                                    "have expected output " +
                                    "(expected: " + expected + ", " +
                                    "actual: " + out + " ).");
                }
            } else {
                logger.info("OBM command (" + obmCommand + ") success. Type: " +
                    self.serviceType, { id: self.nodeId });
                return out;
            }
        });
    };

    /**
     * Attempts to run an OBM command a specified number of times until
     * success.
     *
     * @function retryObmCommand
     *
     * @param {Object} options options for the retry
     * @param {String} options.nodeId - The identifier for the node
     * @param {String} options.obmCommand - an interface function name
     * @param {number} [options.delay] - amount of time (in ms) to delay in between retries
     * @param {number} [options.retries] - number of attempts to make
     * @param {*} [options.expected] - optional expected output to determine
     * success or not. Used primarily with powerStatus assertions.
     *
     * @returns {Promise}
     */
    ObmService.prototype.retryObmCommand = function (obmCommand, expected) {
        var self = this;
        assert.string(obmCommand);

        return self._retryObmCommand(0, obmCommand,
                expected, self.delay)
        .catch(function(error) {
            logger.debug("runObmCommand error.", {
                error: error,
                id: self.nodeId,
                command: obmCommand
            });
            // Not all services support this, and that's okay, don't fail
            // a common reboot/pxe boot use case for machines using these obm
            // services, as they should ideally be configured to pxe already.
            if (error.name === 'ObmConfigurationError' && obmCommand === 'setBootPxe') {
                return;
            } else {
                throw error;
            }
        });
    };

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
     * @returns {Promise} - returns a promise fulfilled with the value of
     * the power status.
     */
    ObmService.prototype.wrapWithStatusCheck = function (obmCommand) {
        var self = this;
        logger.silly("Invoking wrapWithStatusCheck "+self.nodeId+" "+obmCommand);
        // Decide whether we have to run the command or not
        return self.powerStatus()
        .then(function (on) {
            if ((on && obmCommand === 'powerOn') ||
                (!on && obmCommand === 'powerOff') ||
                (!on && obmCommand === 'soft' )) {
                // on here is either a true or false value.
                return Promise.resolve(on);
            } else {
                // If we're not already in the desired state, run the command
                return self.retryObmCommand(obmCommand)
                .then(function () {
                    // Assert we've affected the power state.
                    if (obmCommand === 'powerOn') {
                        // return self.powerStatus(self.nodeId, true);
                        //
                        // Don't bother asserting power status after turning
                        // it on. Sometimes it takes too long (with AMT
                        // specifically) therefore causing race conditions
                        // with workflow states and
                        // properties.request template rendering.
                        // We can ascertain this information anyways when
                        // the node fails to come up.
                        return Promise.resolve(true);
                    } else if (obmCommand === 'powerOff' || obmCommand === 'soft') {
                        // Give a little breathing room after the powerOff
                        // call before we assert the status.
                        return Promise.delay(500)
                            .then(function () {
                                logger.info("Asserting power status is off. ", {
                                    id: self.nodeId
                                });
                                return self.powerStatus(false);
                            });
                    } else {
                        logger.warning("ObmService.wrapWithStatusCheck should only be " +
                        "used with powerOn and powerOff/soft commands.");
                        return Promise.resolve();
                    }
                });
            }
        });
    };

    /**
     * MC Reset Cold interface.
     *
     * Performs an mc reset cold on machine. IPMI specific.
     *
     * @memberOf ObmService
     * @function
     *
     * @param {String} nodeId
     * @returns {Promise}
     */
    ObmService.prototype.mcResetCold = function() {
        var self = this;

        return self.retryObmCommand('mcResetCold')
        .then(function() {
            // BMCs take a while to reset
            return Promise.delay(50 * 1000);
        })
        .then(function() {
            return self.retryObmCommand('mcInfo');
        });
    };

    /**
     * Power On interface.
     *
     * @memberOf ObmService
     * @function
     *
     * @param {String} nodeId
     * @returns {Promise}
     */
    ObmService.prototype.powerOn = function() {
        return this.wrapWithStatusCheck('powerOn');
    };

    /**
     * Power Off interface.
     *
     * @memberOf ObmService
     * @function
     *
     * @param {String} nodeId
     * @returns {Promise}
     */
    ObmService.prototype.powerOff = function() {
        return this.wrapWithStatusCheck('powerOff');
    };

    /**
     * Soft Power Off interface. IPMI specific.
     *
     * @memberOf ObmService
     * @function
     *
     * @param {String} nodeId
     * @returns {Promise}
     */
    ObmService.prototype.softPowerOff = function() {
        return this.wrapWithStatusCheck('soft');
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
     * @returns {Promise}
     */
    ObmService.prototype.reboot = function() {
        var self = this;
        return self.powerOff()
        .then(function() {
            return self.powerOn();
        });
    };

    /**
     * Hard reset interface.
     *
     * Performs a hard reset of machine. IPMI specific.
     *
     * @memberOf ObmService
     * @function
     *
     * @param {String} nodeId
     * @returns {Promise}
     */
    ObmService.prototype.reset = function() {
        return this.retryObmCommand('reset');
    };

    /**
     * Soft Reset interface.
     *
     * Performs a soft reset of machine. IPMI specific.
     *
     * @memberOf ObmService
     * @function
     *
     * @param {String} nodeId
     * @returns {Promise}
     */
    ObmService.prototype.softReset = function() {
        var self = this;
        return self.softPowerOff()
        .then(function() {
            return self.powerOn();
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
     * @returns {Promise}
     */
    ObmService.prototype.powerStatus = function(expected) {
        return this.retryObmCommand('powerStatus', expected);
    };

    /**
     * Set the node to PXE boot on next boot. Not all OBM services will
     * implement this function.
     *
     * @memberOf ObmService
     * @function
     *
     * @param {String} nodeId
     * @returns {Promise}
     */
    ObmService.prototype.setBootPxe = function() {
        // Delay less here since some OBM services
        // just won't have this call.
        return this.retryObmCommand('setBootPxe');
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
    ObmService.prototype.identifyOn = function() {
        return this.retryObmCommand('identifyOn');
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
    ObmService.prototype.identifyOff = function() {
        return this.retryObmCommand('identifyOff');
    };

    /**
     * Will clear the System Event Log. Not all OBM services
     * will implement this function.
     *
     * @memberOf ObmService
     * @function
     *
     * @param {String} nodeId
     * @returns {Promise}
     */
    ObmService.prototype.clearSEL = function() {
        return this.retryObmCommand('clearSEL');
    };

    /**
     * Check whether the specified node support obmSettings
     *
     * @memberOf ObmService
     * @function
     *
     * @description
     * The supported list in on-core/lib/common/constants.js looks like:
     * ObmSettings: {
     *     'panduit-obm-service': [
     *         {
     *             type: 'enclosure'
     *         },
     *         {
     *             type: 'compute',
     *             sku: 'Megatron'
     *         }
     *     ]
     * }
     *
     * @param {Object} node
     * @param {Object} obmSettings
     * @return {String} invalidService - Unsupported service if any
     */
    ObmService.checkValidService = function(node, obmSettings) {
        var reqService;

        obmSettings = _.isArray(obmSettings) ? obmSettings : [obmSettings];

        // Check every obm setting
        // Only resolved when all settings are supported
        return Promise.map(obmSettings, function(setting) {
            reqService = setting.service;

            // If service is not listed, assume it is supported in current node
            if (!Constants.ObmSettings[reqService]) {
                return;
            }

            // Check rules in one obm setting support list
            // Resolved when any of these rules are matched
            return Promise.any(_.map(Constants.ObmSettings[reqService], function(rule) {

                // Check items in one rule
                // Resolved when all items are fulfilled
                return Promise.reduce(_.keys(rule), function(ret, key) {
                    return Promise.resolve().then(function () {
                        // Process special rules before comparing
                        if (key === 'sku') {
                            return _getValidSku(node);
                        }
                    })
                    .then(function() {
                        if (node[key] && (rule[key] !== node[key])) {
                            return Promise.reject();
                        }
                        else {
                            return ret;
                        }
                    })
                    .catch(function() {
                        ret = false;
                        return ret;
                    });
                }, true)
                .then(function(result) {
                    if (result === true) {
                        return Promise.resolve();
                    }
                    else {
                        return Promise.reject();
                    }
                });
            })).catch(function() {
                throw new Errors.BadRequestError(
                    'Service ' + reqService + ' is not supported in current node'
                );
            });

        });
    };

    /**
     *  Get valid sku info from database
     */
    function _getValidSku (node) {
        if (node.sku) {
            return waterline.skus.findOne({ id: node.sku }).then(function (sku) {
                if (sku && sku.name) {
                    node.sku = sku.name;
                }
                else {
                    return Promise.reject();
                }
            });
        }
        else {
            return Promise.reject();
        }
    }

    ObmService.create = function(nodeId, obmServiceFactory, obmSettings, delay, retries) {
        return new ObmService(nodeId, obmServiceFactory, obmSettings, delay, retries);
    };

    return ObmService;
}
