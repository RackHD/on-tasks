// Copyright 2015, EMC, Inc.
/* jshint node:true */

'use strict';

describe(require('path').basename(__filename), function () {
    var base = require('./base-spec');

    base.before(function (context) {
        // create a child injector with on-core and the base pieces we need to test this
        helper.setupInjector([
            helper.require('/spec/mocks/logger.js'),
            helper.requireGlob('/lib/services/*.js'),
            helper.require('/lib/jobs/base-job.js'),
            helper.require('/lib/jobs/obm-control.js')
        ]);

        context.Jobclass = helper.injector.get('Job.Obm.Node');
    });

    describe('Base', function () {
        base.examples();
    });

    describe("reboot-node-job", function() {
        it('invoke a cancel function');
        it('invoke a run function');
    });

});
