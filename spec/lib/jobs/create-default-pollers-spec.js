// Copyright 2015, Renasar Technologies Inc.
/* jshint node:true */

'use strict';

describe("Job.Pollers.CreateDefault", function () {

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
            helper.require('/lib/jobs/create-default-pollers.js'),
            dihelper.simpleWrapper(waterline, 'Services.Waterline')
        ]));

        CleanWorkItems = injector.get('Job.Pollers.CreateDefault');
        Q = injector.get('Q');
        uuid = injector.get('uuid');
    });

    beforeEach(function () {
        waterline.workitems = {
            createIpmiPollers: sinon.stub().returns(Q.resolve())
        };
        waterline.catalogs = {
            findMostRecent: sinon.stub().returns(Q.resolve({
                id: 'bc7dab7e8fb7d6abf8e7d6a1'
            }))
        };
    });

    it('should create pollers for a job with options.nodeId', function (done) {
        var nodeId = 'bc7dab7e8fb7d6abf8e7d6ad';

        var job = new CleanWorkItems({ nodeId: nodeId }, { graphId: uuid.v4() }, uuid.v4());
        job.on('done', function (err) {
            if (err) {
                done(err);
                return;
            }
            try {
                expect(waterline.catalogs.findMostRecent).to.have.been.calledOnce;
                expect(waterline.catalogs.findMostRecent.firstCall.args[0])
                    .to.have.property('node', nodeId);
                expect(waterline.catalogs.findMostRecent.firstCall.args[0])
                    .to.have.property('source', 'bmc');
                expect(waterline.workitems.createIpmiPollers).to.have.been.calledOnce;
                expect(waterline.workitems.createIpmiPollers).to.have.been.calledWith(nodeId);
            } catch (e) {
                done(e);
                return;
            }
            done();
        });

        job.run();
    });

    it('should create pollers for a job with context.target', function (done) {
        var nodeId = 'bc7dab7e8fb7d6abf8e7d6af';

        var job = new CleanWorkItems({}, { target: nodeId, graphId: uuid.v4() }, uuid.v4());
        job.on('done', function (err) {
            if (err) {
                done(err);
                return;
            }
            try {
                expect(waterline.catalogs.findMostRecent).to.have.been.calledOnce;
                expect(waterline.catalogs.findMostRecent.firstCall.args[0])
                    .to.have.property('node', nodeId);
                expect(waterline.catalogs.findMostRecent.firstCall.args[0])
                    .to.have.property('source', 'bmc');
                expect(waterline.workitems.createIpmiPollers).to.have.been.calledOnce;
                expect(waterline.workitems.createIpmiPollers).to.have.been.calledWith(nodeId);
            } catch (e) {
                done(e);
                return;
            }
            done();
        });

        job.run();
    });

    it('should not create pollers when bmc catalog does not exist', function (done) {
        var nodeId = 'bc7dab7e8fb7d6abf8e7d6af';

        waterline.catalogs.findMostRecent.returns(Q.resolve());
        var job = new CleanWorkItems({}, { target: nodeId, graphId: uuid.v4() }, uuid.v4());
        job.on('done', function (err) {
            if (err) {
                done(err);
                return;
            }
            try {
                expect(waterline.catalogs.findMostRecent).to.have.been.calledOnce;
                expect(waterline.catalogs.findMostRecent.firstCall.args[0])
                    .to.have.property('node', nodeId);
                expect(waterline.catalogs.findMostRecent.firstCall.args[0])
                    .to.have.property('source', 'bmc');
                expect(waterline.workitems.createIpmiPollers).to.not.have.been.called;
            } catch (e) {
                done(e);
                return;
            }
            done();
        });

        job.run();
    });
});




