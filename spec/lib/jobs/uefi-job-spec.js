// Copyright 2016, EMC, Inc.
/* jshint node:true */

'use strict';

var uuid = require('node-uuid');

describe('Run a UEFI Application', function () {
    var uefiJob;
    var subscribeRequestProfileStub;
    var subscribeRequestPropertiesStub;
    var subscribeHttpResponseStub;
    var job;

    before(function () {
        helper.setupInjector(
            _.flattenDeep([
                helper.require('/lib/jobs/base-job'),
                helper.require('/lib/jobs/uefi-job')
            ])
        );
        uefiJob = helper.injector.get('Job.Uefi');
        subscribeRequestProfileStub = sinon.stub(
            uefiJob.prototype, '_subscribeRequestProfile');
        subscribeRequestPropertiesStub = sinon.stub(
            uefiJob.prototype, '_subscribeRequestProperties');
        subscribeHttpResponseStub = sinon.stub(
            uefiJob.prototype, '_subscribeHttpResponse');
    });

    beforeEach(function () {
        subscribeRequestProfileStub.reset();
        subscribeRequestPropertiesStub.reset();
        subscribeHttpResponseStub.reset();
        job = new uefiJob(
            {
                profile: 'testprofile',
                repo: 'http://127.0.0.1:8080',
                uefitool: 'testuefi.efi',
                args: 'args'
            },
            {
                target: 'testid'
            },
             uuid.v4());
    });

    after(function () {
        subscribeRequestProfileStub.restore();
        subscribeRequestPropertiesStub.restore();
        subscribeHttpResponseStub.restore();
    });

    it("should have a nodeId value", function () {
        expect(job.nodeId).to.equal('testid');
    });

    it("should have a profile value", function () {
        expect(job.profile).to.equal('testprofile');
    });

    it("should set up message subscribers", function () {
        var cb;
        return job._run().then(function () {
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

});