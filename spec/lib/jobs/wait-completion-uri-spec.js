// Copyright 2016, EMC, Inc.

'use strict';

describe(require('path').basename(__filename), function () {
    var uuid = require('node-uuid'),
        graphId = uuid.v4(),
        taskId = uuid.v4(),
        WaitCompletionJob;
    var subscribeRequestPropertiesStub;
    var subscribeHttpResponseStub;
    var subscribeTaskNotification;

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
        subscribeTaskNotification = sinon.stub(
            WaitCompletionJob.prototype, '_subscribeTaskNotification', function(_taskId, cb){
                var _data = {
                    taskId: taskId,
                    data: 'finished'
                };
                cb(_data);
            });
        });
    });

    it("should run", function() {
        var job = new WaitCompletionJob({completionUri: 'completion'}, {}, graphId);
        job._run().then(function() {
            expect(subscribeRequestPropertiesStub).to.have.been.called;
            expect(subscribeHttpResponseStub).to.have.been.called;
            expect(subscribeTaskNotification).to.have.been.called;
        });
    });

    it("should call _done with task notification message", function() {
        var job = new WaitCompletionJob({completionUri: 'completion'}, {}, graphId);

        var taskDone = sinon.stub(
            WaitCompletionJob.prototype, '_done');

        job.taskId = taskId;

        job._run().then(function() {
                expect(taskDone).to.have.been.called;
            });
    });
});
