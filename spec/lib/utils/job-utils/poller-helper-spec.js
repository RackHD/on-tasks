// Copyright 2015, EMC
/* jshint node: true */

'use strict';

describe("Poller Helper", function () {
    var waterline;
    var pollerHelper;

    before("Poller helper before", function() {
        helper.setupInjector([
            helper.require('/lib/utils/job-utils/poller-helper')
        ]);
        pollerHelper = helper.injector.get('JobUtils.PollerHelper');
        waterline = helper.injector.get('Services.Waterline');
    });

    describe('get node alert message', function() {
        var mockPollers;
        beforeEach('get path before', function() {
            this.sandbox = sinon.sandbox.create();
            mockPollers = _.fill(Array(5), {state: "inaccessible"});
            waterline.workitems = {};
            waterline.nodes = {findByIdentifier: this.sandbox.stub().resolves({"type": "compute"})};
        });

        it("should return non-empty alert message", function() {
            waterline.workitems.find = sinon.stub().resolves(mockPollers);
            return pollerHelper.getNodeAlertMsg("any", "inaccessible", "accessible")
                .then(function(message){
                    expect(message).to.deep.equal({"nodeType": "compute"});
                    expect(waterline.workitems.find).to.be.calledOnce;
                    expect(waterline.nodes.findByIdentifier).to.be.calledOnce;
                });
        });

        it("should return empty alert message if any node is already accessible", function() {
            mockPollers[0] = {"state": "accessible"};
            waterline.workitems.find = sinon.stub().resolves(mockPollers);
            return pollerHelper.getNodeAlertMsg("any", "inaccessible", "accessible")
                .then(function(message){
                    expect(message).to.deep.equal({});
                    expect(waterline.workitems.find).to.be.calledOnce;
                    expect(waterline.nodes.findByIdentifier).to.be.calledOnce;
                });
        });

        it("should return empty alert message if node status is not changed", function() {
            mockPollers[0] = {"state": "accessible"};
            waterline.workitems.find = sinon.stub().resolves(mockPollers);
            return pollerHelper.getNodeAlertMsg("any", "inaccessible", "inaccessible")
                .then(function(message){
                    expect(message).to.deep.equal({});
                    expect(waterline.workitems.find).callCount(0);
                    expect(waterline.nodes.findByIdentifier).callCount(0);
                });
        });

        it("should return empty alert message if only one node is inaccessible", function() {
            mockPollers = _.fill(mockPollers, {state: "accessible"});
            waterline.workitems.find = sinon.stub().resolves(mockPollers);
            return pollerHelper.getNodeAlertMsg("any", "accessible", "inaccessible")
                .then(function(message){
                    expect(message).to.deep.equal({});
                    expect(waterline.workitems.find).callCount(1);
                    expect(waterline.nodes.findByIdentifier).callCount(1);
                });
        });

    });
});
