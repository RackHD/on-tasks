// Copyright 2015, Renasar Technologies Inc.
/* jshint node:true */

'use strict';

describe(__filename, function () {

    var injector;
    beforeEach(function(){
        var _ = helper.baseInjector.get('_');
        // create a child injector with renasar-core and the base pieces we need to test this
        injector = helper.baseInjector.createChild(_.flatten([
            helper.require('/spec/mocks/logger.js'),
            helper.require('/lib/jobs/noop-job.js')
        ]));
    });
    describe("noop-job", function() {

        it('retrievable from injector', function() {
            var job = injector.get('Job.noop');
            expect(job).to.be.ok;
            expect(job).to.be.an.Object;
        });

        it('should have a run function', function() {
            var job = injector.get('Job.noop');
            expect(job.run).to.be.a.function;
        });

        it('should have a cancel function', function() {
            var job = injector.get('Job.noop');
            expect(job.run).to.be.a.function;
        });

        it('invoke a cancel function', function() {
            var job = injector.get('Job.noop');
            return job.cancel().should.eventually.be.fulfilled;
        });

        it('invoke a run function', function() {
            var job = injector.get('Job.noop');
            return job.run().should.eventually.be.fulfilled;
        });

    });

});