// Copyright 2015, Renasar Technologies Inc.
/* jshint node: true */

'use strict';

var base = require('./base-obm-services-spec');

describe('ApcObmService', function() {
    var servicePath = ['/lib/services/apc-obm-service'];

    describe('base', function() {
        base.before('ApcObmService before', servicePath, function(self) {
            self.serviceOptions = {
                config: {
                    'community': 'test',
                    'host': 'test',
                    'port': '9999'
                }
            };
            self.Service = helper.injector.get('apc-obm-service');
        });
        base.beforeEach('ApcObmService beforeEach');
        base.after('ApcObmService after');

        base.runInterfaceTestCases();
    });
});
