// Copyright 2015, EMC, Inc.
/* jshint node: true */

'use strict';

var base = require('./base-obm-services-spec');

describe('RaritanObmService', function() {
    var servicePath = ['/lib/services/raritan-obm-service'];

    describe('base', function() {
        base.before('RaritanObmService before', servicePath, function(self) {
            self.serviceOptions = {
                config: {
                    'port': '9999'
                }
            };
            self.Service = helper.injector.get('raritan-obm-service');
        });
        base.beforeEach('RaritanObmService beforeEach');
        base.after('RaritanObmService after');

        base.runInterfaceTestCases();
    });
});
