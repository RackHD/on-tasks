// Copyright 2015, Renasar Technologies Inc.
/* jshint node: true */

'use strict';

var base = require('./base-obm-services-spec');

describe('PanduitObmService', function() {
    var servicePath = ['/lib/services/panduit-obm-service'];

    describe('base', function() {
        base.before('PanduitObmService before', servicePath, function(self) {
            self.serviceOptions = {
                config: {
                    'host': 'localhost',
                    'community': 'public',
                    'cyclePassword': 'onrack',
                    'mappings': [
                        {
                            "pdu": 1,
                            "outlet": 1
                        },
                        {
                            "pdu": 2,
                            "outlet": 2
                        }
                    ]
                }
            };
            self.Service = helper.injector.get('panduit-obm-service');
        });
        base.beforeEach('PanduitObmService beforeEach');
        base.after('PanduitObmService after');

        // Run assertions that we typically run over the base interface methods
        // against these extra, panduit-specific methods
        
        //no need to add additional Interface, as powerOn/powerOff/powerStatus/reboot 
        //are already defined in public interface.
        base.runInterfaceTestCases([]);         
    });
});
