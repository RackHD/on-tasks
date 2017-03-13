// Copyright 2017, EMC, Inc.

'use strict';

var di = require('di'),
    util = require('util');

module.exports = UcsObmServiceFactory;

di.annotate(UcsObmServiceFactory, 
    new di.Provide('ucs-obm-service')
);
di.annotate(UcsObmServiceFactory, 
    new di.Inject(
        'OBM.base',
        'Promise',
        'Services.Waterline', 
        'Assert', 
        '_',
        'JobUtils.UcsTool',
        'HttpTool'
    )
);
function UcsObmServiceFactory(
    BaseObmService, 
    Promise, 
    waterline,
    assert,
    _,
    UcsTool
) {
    function UcsObmService(options) {
        BaseObmService.call(this, options);
        this.requiredKeys = ['uri'];
        this.params = options.params;
        this.config = options.config;
        this.ucs = this.initClient(this.config);

    }
    util.inherits(UcsObmService, BaseObmService);
    
    UcsObmService.prototype.initClient = function(settings) {
        var ucs = new UcsTool();
        ucs.settings = settings;
        return ucs;
    };

    UcsObmService.prototype.powerOn = function() {
        return this._runInternal('on');
    };
    
    UcsObmService.prototype.powerOff = function() {
        return this._runInternal('off');
    };

    UcsObmService.prototype.reboot = function() {
        return this._runInternal('cycle-immediate');
    };
    
    UcsObmService.prototype.reset = function() {
        return this.reboot();
    };

    UcsObmService.prototype.powerButton = function() {
        return this._runInternal('ipmi-reset');
    };
    
    UcsObmService.prototype.powerStatus = function() {
        var self = this;
        var dn = self.ucs.settings.dn;
        var url=  "/power?identifier=" + dn;
        return self.ucs.clientRequest(url)
        .then(function(res) {
            assert.object(res, 'Response');
            if (res.body.serverState === "down"){
                return false;
            }
            else if(res.body.serverState === "up"){
                return true;
            }
            else {
                throw new Error(
                    'Unknown Power State: ' + self.config.root
                );
            }
        });
    };
    
    UcsObmService.prototype._runInternal = function (action) {
        return this.run({
            action:action
        });
    };
    
    UcsObmService.prototype.run = function (options) {       
        var self = this;
        return Promise.try(function(){
            assert.object(options);
            assert.string(options.action);
            var action = options.action;
            var nodeId = self.options.nodeId;
            return waterline.nodes.findOne(nodeId)
                .then(function(data){
                    var url=  "/power?" + "identifier=" + data.name + "&action=" + action;
                    return self.ucs.clientRequest(url, "POST");
                });
        });
    };   

    
    UcsObmService.create = function(options) {
        return BaseObmService.create(UcsObmService, options);
    };

    return UcsObmService;
}
