// Copyright 2015, EMC, Inc.
/* jshint node:true */

"use strict";

var uuid = require("node-uuid");

describe("Ipmi Power Status Alert Job", function () {
    var base = require('./base-spec');
    var Errors;
    var job;
    var sandbox = sinon.sandbox.create();

    base.before(function (context) {
        helper.setupInjector([
            helper.require('/spec/mocks/logger.js'),
            helper.requireGlob('/lib/services/*.js'),
            helper.require('/lib/jobs/base-job.js'),
            helper.require('/lib/jobs/ipmi-powerStatus-alert-job.js')
        ]);

        Errors = helper.injector.get('Errors');
        context.Jobclass = helper.injector.get('Job.Poller.Alert.Ipmi.PowerStatus');
    });

    before("Ipmi Power Status Alert Job before", function() {
        var baseJob = helper.injector.get('Job.Base');
        sandbox.stub(baseJob.prototype, '_subscribeIpmiCommandResult');
        sandbox.stub(baseJob.prototype, '_publishPollerAlert');
    });

    after("Ipmi Power Status Alert Job after", function() {
        sandbox.restore();
    });

    beforeEach("Ipmi Power Status Alert Job beforeEach", function() {
        job = new this.Jobclass({"cachedPowerState": {}}, { graphId: uuid.v4() }, uuid.v4());
    });

    afterEach("Ipmi Power Status Alert Job afterEach", function() {
        sandbox.reset();
    });

    describe("Base", function () {
        base.examples();
    });


    describe("subscription callbacks", function() {
	it("should set subscription callbacks for ipmi results", function(){
	    sandbox.stub(job, 'determinePowerStatusAlert');
	    job._run();
	    expect(job._subscribeIpmiCommandResult).to.have.been.calledOnce;
	    expect(job._subscribeIpmiCommandResult).to.have.been.calledWith(
		job.routingKey,
		'chassisPower',
		job.determinePowerStatusAlert
	    );
	});


	it("should call powerStateAlerter with cacheStatus == powerStatus", function(){
	    var testdata = {
		"workItemId": "workItemId",
		"node": "testnode",
		"chassisPower": {
		    "status": "ON"
		}
	    };

	    job.cachedPowerState[testdata.workItemId] = "ON";
	    return job.powerStateAlerter(testdata.chassisPower.status, testdata)
		.then(function(status){
		    expect(job._publishPollerAlert).to.not.be.called;
		    expect(status).to.deep.equal(job.cachedPowerState[testdata.workItemId]);
		    expect(job.cachedPowerState[testdata.workItemId]).to.equal(testdata.chassisPower.status);
		});
	});

	it("should call powerStateAlerter with cacheStatus !== powerStatus", function(){
	    var testdata = {
		"workItemId": "workItemId",
		"node": "testnode",
		"chassisPower": {
		    "status": "OFF"
	        }
            };
	    job.cachedPowerState[testdata.workItemId] = "ON";
	    return job.powerStateAlerter(testdata.chassisPower.status, testdata)
		.then(function(status){
		    expect(job._publishPollerAlert).to.have.been.called.once;
		    expect(status).to.deep.equal(job.cachedPowerState[testdata.workItemId]);
		    expect(job.cachedPowerState[testdata.workItemId]).to.equal(testdata.chassisPower.status);
		});

	 });
    });									                                 

});
