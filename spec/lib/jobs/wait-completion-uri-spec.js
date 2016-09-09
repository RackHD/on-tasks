// Copyright 2016, EMC, Inc.

'use strict';

describe(require('path').basename(__filename), function () {
    var uuid = require('node-uuid'),
        graphId = uuid.v4(),
        WaitCompletionJob;
    var subscribeRequestPropertiesStub;
    var subscribeHttpResponseStub;

    before(function() {
        helper.setupInjector([
            helper.require('/lib/jobs/base-job.js'),
            helper.require('/lib/jobs/wait-completion-uri.js'),
        ]);
        WaitCompletionJob = helper.injector.get('Job.Wait.Completion.Uri');
        subscribeRequestPropertiesStub = sinon.stub(
            WaitCompletionJob.prototype, '_subscribeRequestProperties');
        subscribeHttpResponseStub = sinon.stub(
            WaitCompletionJob.prototype, '_subscribeHttpResponse', function(cb) {
                cb({statusCode: 200, url: 'completion'});
        });
    });

    it("should run", function() {
        var job = new WaitCompletionJob({completionUri: 'completion'}, {}, graphId);
        job._run().then(function() {
            expect(subscribeRequestPropertiesStub).to.have.been.called;
            expect(subscribeHttpResponseStub).to.have.been.called;
        });
    });
});
