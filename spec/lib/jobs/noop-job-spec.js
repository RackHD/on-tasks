// Copyright 2015, Renasar Technologies Inc.
/* jshint node:true */

'use strict';

describe(require('path').basename(__filename), function () {
    var base = require('./base-spec');

    base.before(function (context) {
        // create a child injector with renasar-core and the base pieces we need to test this
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

    describe("noop-job", function() {
        it('invoke a cancel function', function(done) {
            var job = new this.Jobclass();
            job.on('done', function() {
                done();
            });
            job.cancel();
        });

        it('invoke a run function', function(done) {
            var job = new this.Jobclass();
            job.on('done', function() {
                done();
            });
            job.run();
        });

    });

});
