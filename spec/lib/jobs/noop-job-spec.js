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
            var Job = injector.get('Job.noop');
            expect(Job).to.be.ok;
            expect(Job).to.be.an.function;
        });

        it('members should have a run function', function() {
            var Job = injector.get('Job.noop');
            expect(Job).to.respondTo('run');
        });

        it('members should have a cancel function', function() {
            var Job = injector.get('Job.noop');
            expect(Job).to.respondTo('cancel');
        });

        it('should ', function() {
            var Job = injector.get('Job.noop');
            expect(Job).itself.to.respondTo('create');
        });

        it('invoke a cancel function', function() {
            var job = injector.get('Job.noop').create();
            return job.cancel().should.eventually.be.fulfilled;
        });

        it('invoke a run function', function() {
            var job = injector.get('Job.noop').create();
            return job.run().should.eventually.be.fulfilled;
        });

    });

});