// Copyright 2015, EMC, Inc.
/* jshint node: true */

'use strict';

var base = require('./base-obm-services-spec');

describe('IpmiObmService', function() {
    var servicePath = ['/lib/services/ipmi-obm-service'];

    describe('base', function() {
        base.before('IpmiObmService before', servicePath, function(self) {
            self.serviceOptions = {
                config: {
                    'host': 'localhost',
                    'user': 'test',
                    'password': 'test'
                }
            };
            self.Service = helper.injector.get('ipmi-obm-service');
        });
        base.beforeEach('IpmiObmService beforeEach');
        base.after('IpmiObmService after');

        // Run assertions that we typically run over the base interface methods
        // against these extra, ipmi-specific methods
        base.runInterfaceTestCases([
            'setBootPxe',
            'soft',
            'reset',
            'identifyOn',
            'identifyOff',
            'mcResetCold',
            'mcInfo',
            'forceBootPxe',
            'clearWatchDog'
        ]);
    });
});
