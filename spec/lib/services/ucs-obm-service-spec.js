// Copyright 2017, EMC, Inc.
/* jshint node: true */

'use strict';

var base = require('./base-obm-services-spec');


describe('UCS OBM Service', function() {
    var servicePath = [ '/lib/services/ucs-obm-service', 
                        '/lib/utils/job-utils/ucs-tool'],
        sandbox = sinon.sandbox.create(),
        testOptions = {
            config: {
                'uri': 'localhost',
                'ucs-user': 'test',
                'ucs-password': 'test'
            },
            params: {
                target: '/sys/chassis-3/blade-3'
            },
            dn : "/sys/chassis-3/blade-3"
        },
        testSystem = {
            body: {
                PowerState : 'On'
            }
        },
        
        waterline = {};
    var node = {
        id: 'abc',
        type: 'enclosure',
        name: 'Node',
        identifiers: [],
        relations: [
            {
                relationType: 'encloses',
                targets: ['/fake']
            },
            {
                relationType: 'enclosedBy',
                targets: ['/fake']
            }
        ]
    };

    before(function() {
        helper.setupInjector([
            helper.di.simpleWrapper(waterline,'Services.Waterline')
        ]);
        waterline.nodes = {
            findOne: sandbox.stub().resolves(node)
        };
    });

    after(function() {
        sandbox.restore();
    });
    
    var tool = {
        clientRequest: sandbox.stub(),
        settings : {
            dn : "dn"
        } 
    };
    
    describe('base', function() {
        var waterline;
        base.before('UCSObmService before', servicePath, function(self) {
            waterline = helper.injector.get('Services.Waterline');
            waterline.nodes = {
                findOne: sandbox.stub().resolves(node)
            };
            self.serviceOptions = testOptions;
            self.Service = helper.injector.get('ucs-obm-service');
            
             sandbox.stub(self.Service.prototype, 'initClient')
                .returns(tool);
            tool.clientRequest.resolves(testSystem);
        });

        base.beforeEach('UcsObmService beforeEach');
        base.after('UcsObmService after');
        base.runInterfaceTestCases(['powerOn',
            'powerOff',
            'reboot',
            'NMI',
            'powerButton',
            'powerStatus']);
    });
    
});
