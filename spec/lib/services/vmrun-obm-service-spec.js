// Copyright 2015, EMC, Inc.
/* jshint node: true */

'use strict';

var base = require('./base-obm-services-spec');

describe('VmrunObmService', function() {
    var servicePath = ['/lib/services/vmrun-obm-service'];

    describe('base', function() {
        base.before('VmrunObmService before', servicePath, function(self) {
            self.serviceOptions = {
                config: {
                    'vmxpath': '/home/test/fusion/machine',
                }
            };
            self.Service = helper.injector.get('vmrun-obm-service');
            sinon.stub(self.Service.prototype, 'validate').resolves();
        });

        base.beforeEach('VmrunObmService beforeEach');

        base.after('VmrunObmService after', function(self) {
            self.Service.prototype.validate.restore();
        });

        base.runInterfaceTestCases();
    });
});
