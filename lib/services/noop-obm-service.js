// Copyright 2014-2015, Renasar Technologies Inc.
/* jshint node: true */

'use strict';

var di = require('di'),
    util = require('util');

module.exports = noopObmServiceFactory;

di.annotate(noopObmServiceFactory, new di.Provide('noop-obm-service'));
di.annotate(noopObmServiceFactory, new di.Inject('Promise', 'lru-cache', 'OBM.base'));

function noopObmServiceFactory(Promise, lruCache, BaseObmService) {
    function NoopObmService() {
        BaseObmService.call(this, {});
        this.requiredKeys = [];
        this.nodePowerStates = NoopObmService.nodePowerStates;
    }
    util.inherits(NoopObmService, BaseObmService);

    NoopObmService.nodePowerStates = lruCache({ max: 100 });

    NoopObmService.prototype.reboot = function() {
        return Promise.resolve(true);
    };

    NoopObmService.prototype.powerOn = function(nodeId) {
        if (nodeId && nodeId.toString) {
            this.nodePowerStates.set(nodeId.toString(), true);
        }
        return Promise.resolve(true);
    };

    NoopObmService.prototype.powerOff = function(nodeId) {
        if (nodeId && nodeId.toString) {
            this.nodePowerStates.set(nodeId.toString(), false);
        }
        return Promise.resolve(true);
    };

    NoopObmService.prototype.powerStatus = function(nodeId) {
        var result = false;
        if (nodeId && nodeId.toString) {
            result = this.nodePowerStates.get(nodeId.toString());
            // Default noop node states to OFF if we haven't seen this nodeId before.
            result = result !== undefined ? result : true;
        }
        return Promise.resolve(result);
    };

    NoopObmService.prototype._runInternal = function() {};

    NoopObmService.prototype.setBootPxe = function() {
        return Promise.resolve(true);
    };

    NoopObmService.create = function(options) {
        return BaseObmService.create(NoopObmService, options);
    };

    return NoopObmService;
}
