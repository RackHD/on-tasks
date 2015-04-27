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

        it('should share a nodePowerStates cache across instances', function() {
            var instance1 = new this.Service();
            var instance2 = new this.Service();
            expect(instance1.nodePowerStates).to.equal(instance2.nodePowerStates);
            instance1.nodePowerStates.set('testnode', false);
            expect(instance2.nodePowerStates.get('testnode')).to.equal(false);
        });
    });
});
