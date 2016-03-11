// Copyright 2015, EMC, Inc.
/* jshint node:true */

'use strict';

var uuid = require('node-uuid');
describe(require('path').basename(__filename), function () {
    var base = require('./base-spec');

    base.before(function (context) {
        // create a child injector with on-core and the base pieces we need to test this
        helper.setupInjector([
            helper.require('/spec/mocks/logger.js'),
            helper.requireGlob('/lib/services/*.js'),
            helper.require('/lib/jobs/base-job.js'),
            helper.require('/lib/jobs/generate-bmc-password.js')
        ]);

        context.Jobclass = helper.injector.get('Job.BMC.Password');

    });

    describe('Base', function () {
        base.examples();
    });

    describe("create-bmc-password-job", function() {

        beforeEach(function(){
            var graphId = uuid.v4();
            this.generateBmcJob  = new this.Jobclass({}, { graphId: graphId }, uuid.v4());
        });

        it("should have a _run() method", function() {
            expect(this.generateBmcJob).to.have.property('_run').with.length(0);
         });

        it("should return an 8 byte password", function() {
            this.generateBmcJob._run();
            expect(this.generateBmcJob.context.password).length(8);
        });
    });

});