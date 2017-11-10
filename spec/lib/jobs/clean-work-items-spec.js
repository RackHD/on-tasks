// Copyright 2015, EMC, Inc.
/* jshint node:true */

'use strict';

describe("Job.Catalog.CleanWorkItems", function () {
    var waterline = {};
    var CleanWorkItems;
    var uuid;

    before(function () {
        // create a child injector with on-core and the base pieces we need to test this
        helper.setupInjector([
            helper.require('/spec/mocks/logger.js'),
            helper.require('/lib/jobs/base-job.js'),
            helper.require('/lib/jobs/clean-work-items.js'),
            helper.di.simpleWrapper(waterline, 'Services.Waterline')
        ]);

        CleanWorkItems = helper.injector.get('Job.WorkItems.Clean');
        uuid = helper.injector.get('uuid');
        waterline.workitems = {
            findExpired: sinon.stub(),
            setFailed: sinon.stub()
        };
    });

    beforeEach(function () {
        waterline.workitems.findExpired.reset();
        waterline.workitems.setFailed.reset();
    });

    it('should clean the work item queue', function (done) {
        var workItems = [{
            id: 'bc7dab7e8fb7d6abf8e7d6ad',
            name: 'Pollers.IPMI'
        }];

        var job = new CleanWorkItems({}, { graphId: uuid.v4() }, uuid.v4());
        job.isPending = sinon.stub();
        job.isPending.onCall(0).returns(true);
        job.isPending.onCall(1).returns(false);
        job.options.queuePollInterval = 0;
        waterline.workitems.findExpired.resolves(workItems);

        job.run();

        setImmediate(function () {
            try {
                expect(waterline.workitems.setFailed).to.have.been.calledOnce;
                expect(waterline.workitems.setFailed).to.have.been.calledWith(null, null, workItems);
                done();
            } catch (e) {
                done(e);
            }
        });

    });
});
