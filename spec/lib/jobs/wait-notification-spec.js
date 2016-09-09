// Copyright 2016, EMC, Inc.

'use strict';

describe(require('path').basename(__filename), function () {
    var uuid = require('node-uuid'),
        graphId = uuid.v4(),
        WaitNotificationJob;
    var subscribeRequestPropertiesStub;
    var subscribeNodeNotificationStub;

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
    });

    it("should run", function() {
        var job = new WaitNotificationJob({}, {}, graphId);
        job._run().then(function() {
            expect(subscribeRequestPropertiesStub).to.have.been.called;
            expect(subscribeNodeNotificationStub).to.have.been.called;
        });
    });
});
