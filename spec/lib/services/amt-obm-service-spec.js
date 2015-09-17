// Copyright 2015, EMC, Inc.
/* jshint node: true */

'use strict';

var base = require('./base-obm-services-spec');

describe('AmtObmService', function() {
    var servicePath = ['/lib/services/amt-obm-service'];

    describe('base', function() {
        base.before('AmtObmService before', servicePath, function(self) {
            self.serviceOptions = {
                config: {
                    'host': 'test',
                    'password': 'test'
                }
            };
            self.Service = helper.injector.get('amt-obm-service');
        });
        base.beforeEach('AmtObmService beforeEach');
        base.after('AmtObmService after');

        base.runInterfaceTestCases();
    });
});
