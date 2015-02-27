// Copyright 2015, Renasar Technologies Inc.
/* jshint node:true */

'use strict';

var uuid = require('node-uuid');

describe('Install OS Job', function () {
    var InstallOsJob;
    var subscribeRequestProfileStub;
    var subscribeRequestPropertiesStub;
    var subscribeHttpResponseStub;
    var job;

    before(function() {
        helper.setupInjector(
            _.flatten([
                helper.require('/lib/jobs/base-job'),
                helper.require('/lib/jobs/install-os')
            ])
        );

        InstallOsJob = helper.injector.get('Job.Os.Install');
        subscribeRequestProfileStub = sinon.stub(
            InstallOsJob.prototype, '_subscribeRequestProfile');
        subscribeRequestPropertiesStub = sinon.stub(
            InstallOsJob.prototype, '_subscribeRequestProperties');
        subscribeHttpResponseStub = sinon.stub(
            InstallOsJob.prototype, '_subscribeHttpResponse');
    });

    beforeEach(function() {
        subscribeRequestProfileStub.reset();
        subscribeRequestPropertiesStub.reset();
        subscribeHttpResponseStub.reset();
        job = new InstallOsJob(
            { profile: 'testprofile', completionUri: '' }, { target: 'testid' }, uuid.v4());
    });

    after(function() {
        subscribeRequestProfileStub.restore();
        subscribeRequestPropertiesStub.restore();
        subscribeHttpResponseStub.restore();
    });

    it("should have a nodeId value", function() {
        expect(job.nodeId).to.equal('testid');
    });

    it("should have a profile value", function() {
        expect(job.profile).to.equal('testprofile');
    });

    it("should set up message subscribers", function() {
        var cb;
        job._run();

        expect(subscribeRequestProfileStub).to.have.been.called;
        expect(subscribeRequestPropertiesStub).to.have.been.called;
        expect(subscribeHttpResponseStub).to.have.been.called;

        cb = subscribeRequestProfileStub.firstCall.args[0];
        expect(cb).to.be.a.function;
        expect(cb.call(job)).to.equal(job.profile);

        cb = subscribeRequestPropertiesStub.firstCall.args[0];
        expect(cb).to.be.a.function;
        expect(cb.call(job)).to.equal(job.options);

        cb = subscribeHttpResponseStub.firstCall.args[0];
        expect(cb).to.be.a.function;
    });
});
