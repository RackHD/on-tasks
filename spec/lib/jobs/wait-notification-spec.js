// Copyright 2016, EMC, Inc.

'use strict';

describe(require('path').basename(__filename), function () {
    var uuid = require('node-uuid'),
        graphId = uuid.v4(),
        WaitNotificationJob;
    var subscribeRequestPropertiesStub;
    var subscribeNodeNotificationStub;
    var doneStub;

    before(function() {
        helper.setupInjector([
            helper.require('/lib/jobs/base-job.js'),
            helper.require('/lib/jobs/wait-notification.js'),
        ]);
        WaitNotificationJob = helper.injector.get('Job.Wait.Notification');
        subscribeRequestPropertiesStub = sinon.stub(
            WaitNotificationJob.prototype, '_subscribeRequestProperties');
        subscribeNodeNotificationStub = sinon.stub(
            WaitNotificationJob.prototype, '_subscribeNodeNotification', function(_nodeId, callback) {
                callback({
                    nodeId: _nodeId
                });
            });
        doneStub = sinon.stub(WaitNotificationJob.prototype, '_done');
    });

    it("should finish job if notification has been received", function() {
        var job = new WaitNotificationJob({}, {}, graphId);
        return job._run().then(function() {
            expect(subscribeRequestPropertiesStub).to.have.callCount(1);
            expect(subscribeNodeNotificationStub).to.have.callCount(1);
            expect(job._done).to.have.callCount(1);
            expect(job._done.firstCall.args[0]).to.equal(undefined);
        });
    });
});
