// Copyright 2014-2015, Renasar Technologies Inc.
/* jshint node: true */

'use strict';

var di = require('di');

module.exports = BaseObmServiceFactory;

di.annotate(BaseObmServiceFactory, new di.Provide('OBM.base'));
di.annotate(BaseObmServiceFactory,
    new di.Inject(
        'Assert', 'Q', '_', 'Logger', 'ChildProcess'
    )
);

function BaseObmServiceFactory (assert, Q, _, Logger, ChildProcess) {
    var logger = Logger.initialize(BaseObmServiceFactory);

    /**
     *
     * @param {Object} config
     * @constructor
     */
    function BaseObmService(options) {
        options = options || {};
        options.retries = options.retries || 0;
        options.delay = options.delay || 0;
        options.config = options.config || {};
        this.options = options;
    }

    BaseObmService.prototype.identifyOn = function() {
        var error = new Error('identify not implemented');
        error.name = 'ObmCommandNotImplementedError';
        return Q.reject(error);
    };

    BaseObmService.prototype.identifyOff = function() {
        var error = new Error('identify not implemented');
        error.name = 'ObmCommandNotImplementedError';
        return Q.reject(error);
    };

    BaseObmService.prototype.reboot = function() {
        var error = new Error('reboot not implemented');
        error.name = 'ObmCommandNotImplementedError';
        return Q.reject(error);
    };

    BaseObmService.prototype.powerOn = function() {
        var error = new Error('powerOn not implemented');
        error.name = 'ObmCommandNotImplementedError';
        return Q.reject(error);
    };

    BaseObmService.prototype.powerOff = function() {
        var error = new Error('powerOff not implemented');
        error.name = 'ObmCommandNotImplementedError';
        return Q.reject(error);
    };

    BaseObmService.prototype.powerStatus = function() {
        var error = new Error('powerStatus not implemented');
        error.name = 'ObmCommandNotImplementedError';
        return Q.reject(error);
    };

    BaseObmService.prototype.setBootPxe = function() {
        var error = new Error('setBootPxe not implemented');
        error.name = 'ObmCommandNotImplementedError';
        return Q.reject(error);
    };

    // NOTE: makes updates to the config object via reference, because we all
    // miss coding in C, don't we?
    BaseObmService.prototype.validateAndSanitize = function() {
        var config = this.options.config;
        var missing = [];

        _.forEach(this.requiredKeys, function(key) {
            if (!_.has(config, key)) {
                missing.push(key);
            }
            if (!_.contains(['password', 'host', 'port'], key) && typeof config[key] === 'string') {
                // Sanitize any spaces the user decided to escape (e.g. copy/paste of a path)
                // These will get passed to us as '\\ ', meaning the slash is
                // escaped, which is obviously not good.
                config[key] = config[key].replace(/\\+\s/g, ' ');
            }
        });

        if (missing.length !== 0) {
            logger.error('Invalid OBM Configuration.', {
                missing: missing
            });
        }

        return missing.length === 0;
    };

    BaseObmService.prototype.run = function(options) {
        var self = this;
        assert.object(options);
        assert.string(options.command);
        return Q.resolve()
        .then(function() {
            self.childProcess = new ChildProcess(
                    options.command, options.args, options.env, options.code);
            return self.childProcess.run({ retries: options.retries, delay: options.delay });
        });
    };

    BaseObmService.prototype.kill = function() {
        if (this.childProcess) {
            this.childProcess.killSafe();
        }
    };

    BaseObmService.create = function(Constructor, options) {
        assert.ok(Constructor);
        if (!Constructor instanceof BaseObmService) {
            throw new Error("Constructor " + Constructor.name + " is not " +
                    "an instance of BaseObmService");
        }
        var instance = new Constructor(options);
        if (instance.validateAndSanitize()) {
            return instance;
        } else {
            return null;
        }
    };

    return BaseObmService;
}
