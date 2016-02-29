// Copyright 2016, EMC, Inc.
/* jshint node: true */

'use strict';

var base = require('./base-obm-services-spec');

describe('Redfish OBM Service', function() {
    var servicePath = ['/lib/services/redfish-obm-service'],
        redfish = require('redfish-node'),
        redfishApi,
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
        testData = [
            null,
            { 
                body: { 
                'reset_type@Redfish.AllowableValues': [
                    'On',
                    'ForceOn',
                    'GracefulShutdown',
                    'ForceOff',
                    'GracefulRestart',
                    'ForceRestart',
                    'Nmi',
                    'PushPowerButton'
                ]}
            }
        ],
        testSystem = [
            null,
            {
                body: {
                PowerState : 'On'
                }
            }
        ];
        
    before(function() {
        redfishApi = Promise.promisifyAll(new redfish.RedfishvApi());
        sandbox.stub(redfishApi);

        redfishApi.listResetTypesAsync.resolves(testData);
        redfishApi.doResetAsync.resolves([
            null,
            { body: {'@odata.id': 'abc123'} }
        ]);
        redfishApi.getSystemAsync.resolves(testSystem);
    });
    
    after(function() {
        sandbox.restore();
    });
    
    describe('redfish service force is false', function() {     
        base.before('before', servicePath, function(self) {
            self.serviceOptions = testOptions;
            self.Service = helper.injector.get('redfish-obm-service');
            sandbox.stub(self.Service.prototype, '_initClient');
            self.Service.prototype._initClient.returns(redfishApi)
                .returns(redfishApi);
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
            sandbox.stub(self.Service.prototype, '_initClient')
                .returns(redfishApi);
        });
        
        base.runInterfaceTestCases([
            'powerOn',
            'powerOff',
            'reboot'
        ]);
    });
    
    describe('redfish service initialize client', function() {  
        var redfishService, baseObm;
        base.before('before', servicePath, function(self) {
            redfishService = helper.injector.get('redfish-obm-service');
            baseObm = helper.injector.get('OBM.base');
        });  
        
        it ('should construct client with credentials', function() {
            redfishService.create(testOptions);
            expect(redfishService).to.be.ok;
            expect(baseObm).to.be.ok;
            expect(baseObm.create).to.have.been.calledWith(redfishService);
        });
    }); 
    
    describe('redfish service initialize client', function() {  
        var redfishService, baseObm;
        base.before('before', servicePath, function(self) {
            redfishService = helper.injector.get('redfish-obm-service');
            baseObm = helper.injector.get('OBM.base');
        });  
        
        it ('should construct client without credentials', function() {
            delete testOptions.config.username;
            delete testOptions.config.password;
            redfishService.create(testOptions);
            expect(redfishService).to.be.ok;
            expect(baseObm).to.be.ok;
            expect(baseObm.create).to.have.been.calledWith(redfishService);
        });
    }); 
});
