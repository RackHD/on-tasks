// Copyright 2015, EMC, Inc.
/* jshint node:true */

'use strict';

describe(require('path').basename(__filename), function () {
    var base = require('./base-spec');

    base.before(function (context) {
        // create a child injector with on-core and the base pieces we need to test this
        helper.setupInjector([
            helper.require('/spec/mocks/logger.js'),
            helper.require('/lib/jobs/base-job.js'),
            helper.require('/lib/jobs/noop-job.js')
        ]);

        context.Jobclass = helper.injector.get('Job.noop');
    });

    describe('Base', function () {
        base.examples();
    });

    it("should run and finish", function() {
        var job = new this.Jobclass();
        return job.run();
    });
});
