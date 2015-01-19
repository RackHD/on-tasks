// Copyright 2015, Renasar Technologies Inc.
/* jshint node:true */

'use strict';

describe(__filename, function () {

    var injector;
    var base = require('./base-spec');

    base.before(function (context) {
        var _ = helper.baseInjector.get('_');
        // create a child injector with renasar-core and the base pieces we need to test this
        injector = helper.baseInjector.createChild(_.flatten([
            helper.require('/spec/mocks/logger.js'),
            helper.requireGlob('/lib/services/*.js'),
            helper.require('/lib/jobs/obm-control.js')
        ]));

        context.Jobclass = injector.get('Job.Obm.Node');
    });

    describe('Base', function () {
        base.examples();
    });

    describe("setpxeboot-node-job", function() {
        it('invoke a cancel function');
        it('invoke a run function');
    });

});
