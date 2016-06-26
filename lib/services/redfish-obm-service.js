// Copyright 2016, EMC, Inc.

'use strict';

var di = require('di'),
    util = require('util');

module.exports = RedfishObmServiceFactory;

di.annotate(RedfishObmServiceFactory, 
    new di.Provide('redfish-obm-service')
);
di.annotate(RedfishObmServiceFactory, 
    new di.Inject(
    'OBM.base',
    'Promise',
    'Services.Waterline',
    'Assert',
    '_',
    'JobUtils.RedfishTool',
    'JobUtils.HttpTool'
    )
);
function RedfishObmServiceFactory(
    BaseObmService, 
    Promise, 
    waterline,
    assert,
    _,
    RedfishTool
) {
    function RedfishObmService(options) {
        BaseObmService.call(this, options);
        this.requiredKeys = ['uri'];
        this.params = options.params;
        this.config = options.config;
        this.redfish = this.initClient(this.config);

    }
    util.inherits(RedfishObmService, BaseObmService);
    
    RedfishObmService.prototype.initClient = function(settings) {
        var redfish = new RedfishTool();
        redfish.settings = settings;
        return redfish;
    };
    
    RedfishObmService.prototype.powerOn = function() {
        if (!this.params.force) {
            return this._runInternal('On');
        }
        return this._runInternal('ForceOn');
    };
    
    RedfishObmService.prototype.powerOff = function() {
        if (!this.params.force) {
            return this._runInternal('GracefulShutdown');
        }
        return this._runInternal('ForceOff');
    };

    RedfishObmService.prototype.reboot = function() {
        if (!this.params.force) {
            return this._runInternal('GracefulRestart');
        }
        return this._runInternal('ForceRestart');
    };
    
    RedfishObmService.prototype.reset = function() {
        return this.reboot();
    };
    
    RedfishObmService.prototype.NMI = function() {
        return this._runInternal('Nmi');
    };
    
    RedfishObmService.prototype.powerButton = function() {
        return this._runInternal('PushPowerButton');
    };
    
    RedfishObmService.prototype.powerStatus = function() {
        var self = this;
        return self.redfish.clientRequest(self.config.root)
        .then(function(res) {
            assert.object(res, 'Response');
            var powerState = _.get(res.body, 'PowerState');
            if (_.isUndefined(powerState)) {
                throw new Error(
                    'Unknown Power State: ' + self.config.root
                );
            } else {
                return (powerState === 'On');
            }
        });
    };
    
    RedfishObmService.prototype._checkAction = function(action) {
        var self = this;
        return self.redfish.clientRequest(self.config.root)
        .then(function(res) {
            assert.object(res, 'Resource Object');
            var actions = _.get(res.body, 'Actions');
            return actions['#ComputerSystem.Reset'];
        })
        .then(function(reset) {
            assert.object(reset, 'Reset Resource');
            var keys = _.keys(reset);
            var match = _.first(_.filter(keys, function(k) {
                return k.indexOf('AllowableValues') !== -1;
            }));
            if (match) {
                return reset[match];
            } else {
                return [
                    "On",
                    "ForceOff",
                    "GracefulShutdown",
                    "GracefulRestart",
                    "ForceRestart",
                    "Nmi",
                    "ForceOn",
                    "PushPowerButton"
                ];
            }
        })
        .then(function(types) {
            assert.ok(Array.isArray(types), 'Reset Type Array');
            if (0 > _.indexOf(types, action)) {
                throw new Error('Unsupported Reset Type ' + action);
            }
        });
    };
    
    RedfishObmService.prototype._runInternal = function (action) {
        return this.run({
            action:action
        });
    };
    
    RedfishObmService.prototype.run = function (options) {       
        var self = this;
        assert.object(options);
        assert.string(options.action);
        var action = options.action;
        return self._checkAction(action)
        .then(function() {
            return self.redfish.clientRequest(self.config.root);
        })
        .then(function(res) {
            assert.object(res, 'Resource Object');
            var resource = _.get(res.body, 'Actions');
            resource = resource['#ComputerSystem.Reset'];
            assert.string(resource.target, 'Resource Target');
            return self.redfish.clientRequest(
                resource.target, 
                'POST',
                { reset_type: action } /* jshint ignore:line */
            );
        });
    };
    
    RedfishObmService.create = function(options) {
        return BaseObmService.create(RedfishObmService, options);
    };

    return RedfishObmService;
}
