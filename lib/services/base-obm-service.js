// Copyright 2014-2015, Renasar Technologies Inc.
/* jshint node: true */

'use strict';

var di = require('di'),
    util = require('util');

module.exports = BaseObmServiceFactory;

di.annotate(BaseObmServiceFactory, new di.Provide('OBM.base'));
di.annotate(BaseObmServiceFactory,
    new di.Inject(
        'Q', '_', 'Logger', 'ChildProcess'
    )
);

function BaseObmServiceFactory (Q, _, Logger, ChildProcess) {
    var logger = Logger.initialize(BaseObmServiceFactory);

    /**
     *
     * @param {Object} config
     * @constructor
     */
    function BaseObmService (config) {
        ChildProcess.call(this);

        var self = this;

        _.keys(config).forEach(function (key) {
            if (!_.isFunction(self[key])) {
                self[key] = config[key];
            }
        });
    }

    util.inherits(BaseObmService, ChildProcess);

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
    BaseObmService.validateAndSanitize = function validate (keys, config) {
        var missing = [];

        _.forEach(keys, function(key) {
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

    BaseObmService.create = function create (Constructor, keys, config) {
        if (BaseObmService.validateAndSanitize(keys, config)) {
            return new Constructor(config);
        } else {
            return null;
        }
    };

    return BaseObmService;
}
