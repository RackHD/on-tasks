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
        //this.requiredKeys = ['uri'];
        this.params = options.params;
        this.config = options.config;
//        this.wsman = this.initClient(this.config);

    }
    util.inherits(DellWsmanObmService, BaseObmService);
    
    DellWsmanObmService.prototype.initClient = function(settings) {
       
//        settings.uri = parse.href;
//        settings.host = parse.host.split(':')[0];
//        settings.root = parse.pathname;
//        settings.port = parse.port;
//        settings.protocol = protocol;
//        settings.verifySSL = false;
//        settings.recvTimeoutMs = 300000;

    };
    
    DellWsmanObmService.prototype.NMI = function() {
        return this._runInternal('Nmi');
    };
    
    DellWsmanObmService.prototype.powerButton = function() {
        return this._runInternal('PushPowerButton');
    };
    
    
    DellWsmanObmService.prototype.powerOn = function() {
//        if (!this.params.force) {
//            return this._runInternal('ON');
//        }
        return this._runInternal('ON');
    };
    
    DellWsmanObmService.prototype.powerOff = function() {
//    	console.log('dell-wsman-obm-service: powerOff');
//        if (!this.params.force) {
//            return this._runInternal('OFF');
//        }
        return this._runInternal('OFF');
    };

    DellWsmanObmService.prototype.powerStatus = function() {
        var self = this;

        return Promise.resolve()
        .then(function() {
            var dell = configuration.get('dell');
            if (!dell || !dell.services.inventory) {
            	throw new Error('Dell Inventory web service is not defined in wsmanConfig.json.');
            }
            
            var parse = urlParse(dell.services.inventory.host);
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
	       			}
	   			var uri = dell.services.inventory.endpoints.summary;
//	   			self.wsman.settings.host = dell.services.management.host;
	            return wsman.clientRequest(uri, 'POST', data)
//            })
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

    DellWsmanObmService.prototype.reboot = function() {
        if (!this.params.force) {
            return this._runInternal('REBOOT');
        }
        return this._runInternal('REBOOT');
    };
    
    DellWsmanObmService.prototype.reset = function() {
        return this.reboot();
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
        return self._checkAction(action)
        .then(function() {
            var dell = configuration.get('dell');
            if (!dell || !dell.services.management) {
            	throw new Error('Dell Management web service is not defined in wsmanConfig.json.');
            }
            
            var parse = urlParse(dell.services.management.host);
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
	       			}
	   			var actionUri = dell.services.management.endpoints.power + '/' + action;
	   			console.log('POWER REQUEST Uri: ' + actionUri);
//	   			self.wsman.settings.host = dell.services.management.host;
	            return wsman.clientRequest(actionUri, 'POST', data)
//            })
        })
        .then(function(res) {
        	return Promise.resolve(res);
        });
    }
    
    
    DellWsmanObmService.create = function(options) {
        return BaseObmService.create(DellWsmanObmService, options);
    }

    return DellWsmanObmService;
}
