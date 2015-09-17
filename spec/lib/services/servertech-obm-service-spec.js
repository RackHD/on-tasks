// Copyright 2015, EMC, Inc.
/* jshint node: true */

'use strict';

var base = require('./base-obm-services-spec');

describe('ServerTechObmService', function() {
    var servicePath = ['/lib/services/servertech-obm-service'];

    describe('base', function() {
        base.before('ServerTechObmService before', servicePath, function(self) {
            self.serviceOptions = {
                config: {
                    'community': 'test',
                    'host': 'test',
                    'port': '9999'
                }
            };
            self.Service = helper.injector.get('servertech-obm-service');
        });
        base.beforeEach('ServerTechObmService beforeEach');
        base.after('ServerTechObmService after');

        base.runInterfaceTestCases();
    });
});
