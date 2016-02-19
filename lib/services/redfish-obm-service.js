// Copyright 2016, EMC, Inc.

'use strict';

var di = require('di'),
    util = require('util'),
    redfish = require('redfish-node');

module.exports = redfishObmServiceFactory;

di.annotate(redfishObmServiceFactory, 
    new di.Provide('redfish-obm-service')
);
di.annotate(redfishObmServiceFactory, 
    new di.Inject(
    'OBM.base',
    'Promise',
    'Services.Waterline',
    'Assert',
    '_'
    )
);
function redfishObmServiceFactory(
    BaseObmService, 
    Promise, 
    waterline,
    assert,
    _
) {
    function redfishObmService(options) {
        BaseObmService.call(this, options);
        this.requiredKeys = ['uri'];
        this.params = options.params;
        this.config = options.config;
        
        this.targetId = this.params.target.split(/^.*\/(.*)$/)[1];
        assert.string(this.targetId, 'expected target id string ' + this.targetId);
        this.redfishApi = this._initClient();
    }
    util.inherits(redfishObmService, BaseObmService);
    
    redfishObmService.prototype.powerOn = function() {
        if (!this.params.force) {
            return this._runInternal('On');
        }
        return this._runInternal('ForceOn');
    };
    
    redfishObmService.prototype.powerOff = function() {
        if (!this.params.force) {
            return this._runInternal('GracefulShutdown');
        }
        return this._runInternal('ForceOff');
    };

    redfishObmService.prototype.reboot = function() {
        if (!this.params.force) {
            return this._runInternal('GracefulRestart');
        }
        return this._runInternal('ForceRestart');
    };
    
    redfishObmService.prototype.NMI = function() {
        return this._runInternal('Nmi');
    };
    
    redfishObmService.prototype.powerButton = function() {
        return this._runInternal('PushPowerButton');
    };
    
    redfishObmService.prototype.powerStatus = function() {
        return Promise.resolve(); // (jl) TODO
    };
        
    redfishObmService.prototype._initClient = function () {
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
    
    redfishObmService.prototype._checkAction = function(action) {
        return this.redfishApi.listResetTypesAsync(this.targetId)
        .then(function(res) {
            var resetTypes = res[1].body['reset_type@Redfish.AllowableValues'];
            assert.ok(Array.isArray(resetTypes), 
                'expected an array of reset types');
            if (0 > _.indexOf(resetTypes, action)) {
                throw new Error('unsupported reset type ' + action);
            }
        })
        .then(function() {
            return Promise.resolve();
        })
        .catch(function(err) {
            return Promise.reject(err);
        });
    };
    
    redfishObmService.prototype._runInternal = function (action) {
        return this.run({
            action:action
        });
    };
    
    redfishObmService.prototype.run = function (options) {       
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
            return Promise.resolve(taskId);
        });
    };
    
    redfishObmService.create = function(options) {
        return BaseObmService.create(redfishObmService, options);
    };

    return redfishObmService;
}
