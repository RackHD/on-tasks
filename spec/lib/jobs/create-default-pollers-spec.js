// Copyright 2015, Renasar Technologies Inc.
/* jshint node:true */

'use strict';

describe("Job.Pollers.CreateDefault", function () {
    var waterline = {};
    var taskProtocol = {};
    var CreateDefaultPollers;
    var pollers;
    var Promise;
    var uuid;

    before(function () {
        // create a child injector with on-core and the base pieces we need to test this
        helper.setupInjector([
            helper.require('/spec/mocks/logger.js'),
            helper.require('/lib/jobs/base-job.js'),
            helper.require('/lib/jobs/create-default-pollers.js'),
            helper.di.simpleWrapper(waterline, 'Services.Waterline'),
            helper.di.simpleWrapper(taskProtocol, 'Protocol.Task')
        ]);

        CreateDefaultPollers = helper.injector.get('Job.Pollers.CreateDefault');
        Promise = helper.injector.get('Promise');
        uuid = helper.injector.get('uuid');
    });

    beforeEach(function () {
        waterline.workitems = {
            create: sinon.stub().resolves()
        };
        waterline.catalogs = {
            findMostRecent: sinon.stub().resolves({
                id: 'bc7dab7e8fb7d6abf8e7d6a1'
            })
        };
        taskProtocol.subscribeActiveTaskExists = sinon.stub().returns(Promise.resolve({
            dispose: sinon.stub()
        }));
        pollers = [
            {
                "type": "ipmi",
                "pollInterval": 60000,
                "config": {
                    "command": "power"
                }
            }
        ];
    });

    it('should create pollers for a job with options.nodeId', function () {
        var nodeId = 'bc7dab7e8fb7d6abf8e7d6ad';

        var job = new CreateDefaultPollers(
            { nodeId: nodeId, pollers: pollers },
            { graphId: uuid.v4() },
            uuid.v4()
        );

        return job.run()
        .then(function() {
            expect(waterline.catalogs.findMostRecent).to.have.been.calledOnce;
            expect(waterline.catalogs.findMostRecent.firstCall.args[0])
                .to.have.property('node', nodeId);
            expect(waterline.catalogs.findMostRecent.firstCall.args[0])
                .to.have.property('source', 'bmc');
            expect(waterline.workitems.create).to.have.been.calledOnce;
            expect(waterline.workitems.create).to.have.been.calledWith(pollers[0]);
        });
    });

    it('should create pollers for a job with context.target', function () {
        var nodeId = 'bc7dab7e8fb7d6abf8e7d6af';

        var job = new CreateDefaultPollers(
            { pollers: pollers },
            { target: nodeId, graphId: uuid.v4() },
            uuid.v4()
        );

        return job.run()
        .then(function() {
            expect(waterline.catalogs.findMostRecent).to.have.been.calledOnce;
            expect(waterline.catalogs.findMostRecent.firstCall.args[0])
                .to.have.property('node', nodeId);
            expect(waterline.catalogs.findMostRecent.firstCall.args[0])
                .to.have.property('source', 'bmc');
            expect(waterline.workitems.create).to.have.been.calledOnce;
            expect(waterline.workitems.create).to.have.been.calledWith(pollers[0]);
        });
    });

    it('should not create pollers when bmc catalog does not exist', function () {
        var nodeId = 'bc7dab7e8fb7d6abf8e7d6af';

        waterline.catalogs.findMostRecent.resolves();

        var job = new CreateDefaultPollers(
            { pollers: pollers },
            { target: nodeId, graphId: uuid.v4() },
            uuid.v4()
        );

        return job.run()
        .then(function() {
            expect(waterline.catalogs.findMostRecent).to.have.been.calledOnce;
            expect(waterline.catalogs.findMostRecent.firstCall.args[0])
                .to.have.property('node', nodeId);
            expect(waterline.catalogs.findMostRecent.firstCall.args[0])
                .to.have.property('source', 'bmc');
            expect(waterline.workitems.create).to.not.have.been.called;
        });
    });

    it('should create multiple pollers', function () {
        var nodeId = 'bc7dab7e8fb7d6abf8e7d6ad';

        pollers.push({
            "type": "snmp",
            "pollInterval": 60000,
            "config": {
                "metric": "snmp-interface-bandwidth-utilization"
            }
        });

        var job = new CreateDefaultPollers(
            { nodeId: nodeId, pollers: pollers },
            { graphId: uuid.v4() },
            uuid.v4()
        );

        return job.run()
        .then(function() {
            expect(waterline.catalogs.findMostRecent).to.have.been.calledTwice;
            expect(waterline.catalogs.findMostRecent.firstCall.args[0])
                .to.have.property('node', nodeId);
            expect(waterline.catalogs.findMostRecent.firstCall.args[0])
                .to.have.property('source', 'bmc');
            expect(waterline.catalogs.findMostRecent.secondCall.args[0])
                .to.have.property('node', nodeId);
            expect(waterline.catalogs.findMostRecent.secondCall.args[0])
                .to.have.property('source', 'snmp-1');
            expect(waterline.workitems.create).to.have.been.calledTwice;
            expect(waterline.workitems.create).to.have.been.calledWith(pollers[0]);
            expect(waterline.workitems.create).to.have.been.calledWith(pollers[1]);
        });
    });
});




