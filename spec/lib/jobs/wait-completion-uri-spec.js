// Copyright 2016, EMC, Inc.

'use strict';

describe(require('path').basename(__filename), function () {
    var uuid = require('node-uuid'),
        graphId = uuid.v4(),
        WaitCompletionJob;
    var subscribeRequestPropertiesStub;
    var subscribeHttpResponseStub;
    var doneStub;
    var job;

    before(function() {
        helper.setupInjector([
            helper.require('/lib/jobs/base-job.js'),
            helper.require('/lib/jobs/wait-completion-uri.js'),
        ]);
        WaitCompletionJob = helper.injector.get('Job.Wait.Completion.Uri');
        subscribeRequestPropertiesStub = sinon.stub(
            WaitCompletionJob.prototype, '_subscribeRequestProperties');
        subscribeHttpResponseStub = sinon.stub(
            WaitCompletionJob.prototype, '_subscribeHttpResponse');
        job = new WaitCompletionJob({completionUri: 'testCompletion'}, {}, graphId);
        doneStub = sinon.stub(WaitCompletionJob.prototype, '_done');
    });

    beforeEach(function() {
        subscribeRequestPropertiesStub.reset();
        subscribeHttpResponseStub.restore();
        doneStub.reset();
    });

    it("should finish job if http response has expected completionUri", function() {
        subscribeHttpResponseStub = sinon.stub(
            WaitCompletionJob.prototype, '_subscribeHttpResponse', function(cb) {
                cb({statusCode: 200, url: 'http://172.31.128.1:9080/foo/bar/testCompletion'});
        });
        return job._run().then(function() {
            expect(subscribeRequestPropertiesStub).to.have.callCount(1);
            expect(subscribeHttpResponseStub).to.have.callCount(1);
            expect(job._done).to.have.callCount(1);
            expect(job._done.firstCall.args[0]).to.equal(undefined);
        });
    });

    it('should not finish job if http response has bad http statusCode', function() {
        subscribeHttpResponseStub = sinon.stub(
            WaitCompletionJob.prototype, '_subscribeHttpResponse', function(cb) {
                cb({statusCode: 400, url: 'http://172.31.128.1:9080/foo/bar/testCompletion'});
        });
        return job._run().then(function() {
            expect(subscribeRequestPropertiesStub).to.have.callCount(1);
            expect(job._done).to.have.not.been.called;
        });
    });

    it('should not finish job if http response has no expected completionUri', function() {
        subscribeHttpResponseStub = sinon.stub(
            WaitCompletionJob.prototype, '_subscribeHttpResponse', function(cb) {
                cb({statusCode: 200, url: 'http://172.31.128.1:9080/foo/bar/test123'});
        });
        return job._run().then(function() {
            expect(subscribeRequestPropertiesStub).to.have.callCount(1);
            expect(job._done).to.have.not.been.called;
        });
    });
});
