// Copyright 2015, EMC, Inc.
/* jshint node: true */

'use strict';

var base = require('./base-obm-services-spec');

describe('VBoxObmService', function() {
    var servicePath = ['/lib/services/vbox-obm-service'];

    describe('base', function() {
        base.before('VBoxObmService before', servicePath, function(self) {
            self.serviceOptions = {
                config: {
                    'alias': 'testvmalias',
                    'user': 'test'
                }
            };
            self.Service = helper.injector.get('vbox-obm-service');
        });
        base.beforeEach('VBoxObmService beforeEach');
        base.after('VBoxObmService after');

        base.runInterfaceTestCases();
    });
});
