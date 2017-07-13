// Copyright 2016, Dell, Inc.

'use strict';

var di = require('di'),
    util = require('util'),
    urlParse = require('url-parse');

module.exports = DellWsmanObmServiceFactory;

di.annotate(DellWsmanObmServiceFactory, 
    new di.Provide('dell-wsman-obm-service')
);
di.annotate(DellWsmanObmServiceFactory, 
    new di.Inject(
    'OBM.base',
    'Promise',
    'Services.Waterline',
    'Services.Configuration',
    'Services.Encryption',
    'Assert',
    '_',
    'JobUtils.WsmanTool'
    )
);
function DellWsmanObmServiceFactory(
    BaseObmService, 
    Promise, 
    waterline,
    configuration,
    encryption,
    assert,
    _,
    WsmanTool
) {
    function DellWsmanObmService(options) {
        BaseObmService.call(this, options);
        this.params = options.params;
        this.config = options.config;
    }
    util.inherits(DellWsmanObmService, BaseObmService);
    
    // DellWsmanObmService.prototype.NMI = function() {
    //     return this._runInternal('Nmi');
    // };
    
    DellWsmanObmService.prototype.powerButton = function() {
        return this._runInternal('ON');
    };
    
    DellWsmanObmService.prototype.powerOn = function() {
        return this._runInternal('ON');
    };
    
    DellWsmanObmService.prototype.powerOff = function() {
        return this._runInternal('OFF');
    };

    DellWsmanObmService.prototype.reboot = function() {
        return this._runInternal('REBOOT');
    };
    
    DellWsmanObmService.prototype.reset = function() {
        return this.reboot();
    };
    
    DellWsmanObmService.prototype.powerStatus = function() {
        var self = this;

        return Promise.resolve()
        .then(function() {
            var dell = configuration.get('dell');
            if (!dell || !dell.services.inventory) {
            	throw new Error('Dell Inventory web service is not defined in wsmanConfig.json.');
            }
            
            var parse = urlParse(dell.gateway);
            var protocol = parse.protocol.replace(':','').trim();
            var wsmanSettings = {
                    uri: parse.href,
                    host: parse.host.split(':')[0],
                    root: parse.pathname,
                    port: parse.port,
                    protocol: protocol,
                    verifySSL: self.options.verifySSL || false,
                    recvTimeoutMs: 300000
            };
            var wsman = new WsmanTool();
            wsman.settings = wsmanSettings;        	
        	
        	var data = {
                address: self.config.host,
                userName: self.config.user,
                password: encryption.decrypt(self.config.password)
            };
            var uri = dell.services.inventory.summary;
            return wsman.clientRequest(uri, 'POST', data);
        })
        .then(function(res) {
        	console.log('Current Power State: ' + res.body.powerState);
        	if(res.body.powerState === '2' || res.body.powerState === 'On'){
        		return true;
        	} else {
        		return false;
        	}
        });
    };

    DellWsmanObmService.prototype._checkAction = function(action) {
        return Promise.resolve();
    };
    
    DellWsmanObmService.prototype._runInternal = function (action) {
        return this.run({
            action:action
        });
    };
    
    DellWsmanObmService.prototype.run = function (options) {
        var self = this;
        assert.object(options);
        assert.string(options.action);
        var action = options.action;
        var dell = configuration.get('dell');
        if (!dell || !dell.services.action) {
            throw new Error('Dell ACTION web service is not defined in wsmanConfig.json.');
        }
        
        var parse = urlParse(dell.gateway);
        var protocol = parse.protocol.replace(':','').trim();
        var wsmanSettings = {
                uri: parse.href,
                host: parse.host.split(':')[0],
                root: parse.pathname,
                port: parse.port,
                protocol: protocol,
                verifySSL: self.options.verifySSL || false,
                recvTimeoutMs: 300000
        };
        var wsman = new WsmanTool();
        wsman.settings = wsmanSettings;        	
        
        var data = {
            address: self.config.host,
            userName: self.config.user,
            password: encryption.decrypt(self.config.password)
        };
        var actionUri = dell.services.action.power;
        actionUri = actionUri.replace(/{action}/, action.toUpperCase());
        return wsman.clientRequest(actionUri, 'POST', data)
        .then(function(res) {
            return Promise.resolve(res);
        });
    }
    
    
    DellWsmanObmService.create = function(options) {
        return BaseObmService.create(DellWsmanObmService, options);
    }

    return DellWsmanObmService;
}
