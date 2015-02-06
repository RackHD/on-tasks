// Copyright 2015, Renasar Technologies Inc.
/* jshint node:true */

'use strict';

describe("Job.Catalog.GenerateSku", function () {

    var injector;
    var waterline = {};
    var CleanWorkItems;
    var Q;
    var uuid;

    before(function () {
        var _ = helper.baseInjector.get('_');
        // create a child injector with renasar-core and the base pieces we need to test this
        injector = helper.baseInjector.createChild(_.flatten([
            helper.require('/spec/mocks/logger.js'),
            helper.require('/lib/jobs/base-job.js'),
            helper.require('/lib/jobs/clean-work-items.js'),
            dihelper.simpleWrapper(waterline, 'Services.Waterline')
        ]));

        CleanWorkItems = injector.get('Job.WorkItems.Clean');
        Q = injector.get('Q');
        uuid = injector.get('uuid');
    });

    beforeEach(function () {
        waterline.workitems = {
            findExpired: sinon.stub(),
            setFailed: sinon.stub()
        };
    });

    it('should clean the work item queue', function (done) {
        var workItems = [{
            id: 'bc7dab7e8fb7d6abf8e7d6ad',
            name: 'Pollers.IPMI'
        }];

        var job = new CleanWorkItems({}, { graphId: uuid.v4() }, uuid.v4());
        job.on('done', function (err) {
            done(err);
        });

        waterline.workitems.findExpired.returns(Q.resolve(workItems));
        job.run();
        process.nextTick(function () {
            expect(waterline.workitems.setFailed).to.have.been.calledOnce;
            expect(waterline.workitems.setFailed).to.have.been.calledWith(null, workItems);
            job.cancel();
        });
    });

});



