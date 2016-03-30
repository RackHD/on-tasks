// Copyright 2016, EMC, Inc.
/* jshint node: true */

'use strict';

var base = require('./base-obm-services-spec');

describe('Redfish OBM Service', function() {
    var servicePath = [ '/lib/services/redfish-obm-service', 
                        '/lib/utils/job-utils/redfish-tool' ],
        sandbox = sinon.sandbox.create(),
        testOptions = {
            config: {
                'uri': 'localhost',
                'username': 'test',
                'password': 'test'
            },
            params: {
                target: '/redfish/v1/Systems/123abc',
                force: false
            }
        },
        testSystem = {
            body: {
                PowerState : 'On'
            }
        },
        testActions = {
            body: {
                Actions: { 
                    "#ComputerSystem.Reset": {
                            'target': '/redfish/reset/path',
                            "ResetType@Redfish.AllowableValues": [
                            "On",
                            "ForceOff",
                            "ForceRestart",
                            "Nmi",
                            "PushPowerButton" 
                        ]
                    }
                }
            }
        };
    
    after(function() {
        sandbox.restore();
    });
    
    var tool = {
        clientRequest: sandbox.stub()
    };
    
    describe('redfish service force is false', function() {     
        base.before('before', servicePath, function(self) { 
            self.serviceOptions = testOptions;
            self.Service = helper.injector.get('redfish-obm-service');
            sandbox.stub(self.Service.prototype, 'initClient')
                .returns(tool);
            tool.clientRequest.resolves(testSystem);
        });
        
        base.runInterfaceTestCases([
            'powerOn',
            'powerOff',
            'reboot',
            'NMI',
            'powerButton',
            'powerStatus'
        ]);
    });
    
    describe('redfish service force is true', function() {  
        base.before('before', servicePath, function(self) {
            testOptions.params.force = true;
            self.serviceOptions = testOptions;
            self.Service = helper.injector.get('redfish-obm-service');
            sandbox.stub(self.Service.prototype, 'initClient')
                .returns(tool);
            tool.clientRequest.resolves(testSystem);
        });
        
        base.runInterfaceTestCases([
            'powerOn',
            'powerOff',
            'reboot'
        ]);
    });

    describe('redfish service with reset resource', function() {  
        base.before('before', servicePath, function(self) {
            self.serviceOptions = testOptions;
            self.Service = helper.injector.get('redfish-obm-service');
            sandbox.stub(self.Service.prototype, 'initClient')
                .returns(tool);
            tool.clientRequest.resolves(testActions);
        });
        base.runInterfaceTestCases();
    });
    
    describe('redfish service with schema reset definitions', function() {  
        base.before('before', servicePath, function(self) {
            self.serviceOptions = testOptions;
            self.Service = helper.injector.get('redfish-obm-service');
            sandbox.stub(self.Service.prototype, 'initClient')
                .returns(tool);
            tool.clientRequest.resolves({ 
                body: { 
                    Actions: { "#ComputerSystem.Reset": { 'target': '/redfish/reset/path' } 
                } 
            }});   
        });
        base.runInterfaceTestCases();
    });
    
    
    describe('redfish http client', function() {
        var redfishService, baseObm;
        base.before('before', servicePath, function(self) { // jshint ignore:line
            redfishService = helper.injector.get('redfish-obm-service');
            baseObm = helper.injector.get('OBM.base');
        });

        it ('should construct client', function() {
            redfishService.create(testOptions);
            expect(redfishService).to.be.ok;
            expect(baseObm).to.be.ok;
            expect(baseObm.create).to.have.been.calledWith(redfishService);
        });
    });
});
