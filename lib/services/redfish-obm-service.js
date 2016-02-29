// Copyright 2016, EMC, Inc.

'use strict';

var di = require('di'),
    util = require('util'),
    redfish = require('redfish-node');

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
    '_'
    )
);
function RedfishObmServiceFactory(
    BaseObmService, 
    Promise, 
    waterline,
    assert,
    _
) {
    function RedfishObmService(options) {
        BaseObmService.call(this, options);
        this.requiredKeys = ['uri'];
        this.params = options.params;
        this.config = options.config;
        
        this.targetId = this.params.target.split(/^.*\/(.*)$/)[1];
        assert.string(this.targetId, 'expected target id string ' + this.targetId);
        this.redfishApi = this._initClient();
    }
    util.inherits(RedfishObmService, BaseObmService);
    
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
    
    RedfishObmService.prototype.NMI = function() {
        return this._runInternal('Nmi');
    };
    
    RedfishObmService.prototype.powerButton = function() {
        return this._runInternal('PushPowerButton');
    };
    
    RedfishObmService.prototype.powerStatus = function() {
        var self = this;
        return self.redfishApi.getSystemAsync(self.targetId)
        .then(function(res) {
            assert.ok(Array.isArray(res),
                'expected array response type');
            assert.object(res[1].body,
                'expected object type in response body');
            var powerState = _.get(res[1].body, 'PowerState');
            if (_.isUndefined(powerState)) {
                throw new Error(
                    'power state undefined for target ' + self.targetId
                );
            } else {
                return (powerState === 'On');
            }
        })
        .catch(function(err) {
            if (_.has(err, 'response.text')) {
                throw new Error(err.response.text);
            } else {
                throw err;
            }
        });
    };
        
    RedfishObmService.prototype._initClient = function () {
        var apiClient = new redfish.ApiClient();
        apiClient.basePath = this.options.config.uri.replace(/\/+$/, '');
        
        // setup basic authorization
        if (!_.isUndefined(this.config.username) && 
            !_.isUndefined(this.config.password)) {
            var token = new Buffer(
                this.config.username + ':' + this.config.password
            ).toString('base64');
            apiClient.defaultHeaders.Authorization = 'Basic ' + token;
            process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
        }
        
        var redfishApi = Promise.promisifyAll(new redfish.RedfishvApi(apiClient));
        return redfishApi;
    };
    
    RedfishObmService.prototype._checkAction = function(action) {
        var self = this;
        return Promise.resolve()
        .then(function() {
            return self.redfishApi.listResetTypesAsync(self.targetId)
            .then(function(res) {
                var resetTypes = res[1].body['reset_type@Redfish.AllowableValues'];
                assert.ok(Array.isArray(resetTypes), 
                    'expected an array of reset types');
                if (0 > _.indexOf(resetTypes, action)) {
                    throw new Error('unsupported reset type ' + action);
                }
            });
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
            return self.redfishApi.doResetAsync(
                self.targetId, 
                { reset_type: action }
            )
            .catch(function(err) {
                throw new Error(err.response.text);
            });
        })
        .then(function(res) {
            assert.ok(Array.isArray(res), 'expected an array response type');
            var taskId = res[1].body['@odata.id'];
            assert.string(taskId);
            return taskId;
        });
    };
    
    RedfishObmService.create = function(options) {
        return BaseObmService.create(RedfishObmService, options);
    };

    return RedfishObmService;
}
