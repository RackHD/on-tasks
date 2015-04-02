// Copyright 2015, Renasar Technologies Inc.
/* jshint node: true */

'use strict';

var base = require('./base-obm-services-spec');

describe('NoopObmService', function() {
    var servicePath = ['/lib/services/noop-obm-service'];

    describe('base', function() {
        base.before('NoopObmService before', servicePath, function(self) {
            self.serviceOptions = {
                config: { }
            };
            self.Service = helper.injector.get('noop-obm-service');
        });
        base.beforeEach('NoopObmService beforeEach');
        base.after('NoopObmService after');

        base.runInterfaceTestCases();
    });
});
