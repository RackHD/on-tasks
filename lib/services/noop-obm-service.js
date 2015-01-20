// Copyright 2014-2015, Renasar Technologies Inc.
/* jshint node: true */

'use strict';

var di = require('di'),
    util = require('util');

module.exports = noopObmServiceFactory;

di.annotate(noopObmServiceFactory, new di.Provide('noop-obm-service'));
di.annotate(noopObmServiceFactory, new di.Inject('Q', 'lru-cache', 'OBM.base'));

function noopObmServiceFactory(Q, lruCache, BaseObmService) {
    function NoopObmService() {
        BaseObmService.call(this, {});
        this.nodePowerStates = lruCache({ max: 10 });
    }

    util.inherits(NoopObmService, BaseObmService);

    NoopObmService.prototype.reboot = function() {
        return Q.resolve(true);
    };

    NoopObmService.prototype.powerOn = function(nodeId) {
        if (nodeId && nodeId.toString) {
            this.nodePowerStates.set(nodeId.toString(), true);
        }
        return Q.resolve(true);
    };

    NoopObmService.prototype.powerOff = function(nodeId) {
        if (nodeId && nodeId.toString) {
            this.nodePowerStates.set(nodeId.toString(), false);
        }
        return Q.resolve(true);
    };

    NoopObmService.prototype.powerStatus = function(nodeId) {
        var result = true;
        if (nodeId && nodeId.toString) {
            result = this.nodePowerStates.get(nodeId.toString());
            // Default noop node states to ON if we haven't seen this nodeId before.
            result = result !== undefined ? result : true;
        }
        return Q.resolve(result);
    };

    NoopObmService.prototype.setBootPxe = function() {
        return Q.resolve(true);
    };

    return function(config) {
        return BaseObmService.create(
            NoopObmService,
            [],
            config
        );
    };
}
