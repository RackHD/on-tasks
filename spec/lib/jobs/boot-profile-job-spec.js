// Copyright 2016, EMC, Inc.
/* jshint node:true */

'use strict';

var uuid = require('node-uuid');

describe('Boot a profile', function () {
    var BootProfileJob;
    var subscribeRequestProfileStub;
    var subscribeRequestPropertiesStub;
    var job;

    before(function () {
        helper.setupInjector(
            _.flattenDeep([
                helper.require('/lib/jobs/base-job'),
                helper.require('/lib/jobs/boot-profile')
            ])
        );
        BootProfileJob = helper.injector.get('Job.BootProfile');
        subscribeRequestProfileStub = sinon.stub(
            BootProfileJob.prototype, '_subscribeRequestProfile');
        subscribeRequestPropertiesStub = sinon.stub(
            BootProfileJob.prototype, '_subscribeRequestProperties');
    });

    beforeEach(function () {
        subscribeRequestProfileStub.reset();
        subscribeRequestPropertiesStub.reset();
        job = new BootProfileJob(
            {
                profile: 'testprofile'
            },
            {
                target: 'testid'
            },
            uuid.v4());
    });

    after(function () {
        subscribeRequestProfileStub.restore();
        subscribeRequestPropertiesStub.restore();
    });

    it("should have a nodeId value", function () {
        expect(job.nodeId).to.equal('testid');
    });

    it("should have a profile value", function () {
        expect(job.profile).to.equal('testprofile');
    });

    it("should set up message subscribers", function () {
        var cb;
        job._run();
        expect(subscribeRequestProfileStub).to.have.been.called;
        expect(subscribeRequestPropertiesStub).to.have.been.called;

        cb = subscribeRequestProfileStub.firstCall.args[0];
        expect(cb).to.be.a.function;
        expect(cb.call(job)).to.equal(job.profile);

        cb = subscribeRequestPropertiesStub.firstCall.args[0];
        expect(cb).to.be.a.function;
        expect(cb.call(job)).to.equal(job.options);
    });

});
