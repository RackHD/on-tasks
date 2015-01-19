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
            helper.require('/lib/jobs/noop-job.js')
        ]));

        context.Jobclass = injector.get('Job.noop');
    });

    describe('Base', function () {
        base.examples();
    });

    describe("noop-job", function() {
        it('invoke a cancel function', function() {
            var job = this.Jobclass.create();
            return job.cancel().should.eventually.be.fulfilled;
        });

        it('invoke a run function', function() {
            var job = this.Jobclass.create();
            return job.run().should.eventually.be.fulfilled;
        });

    });

});