// Copyright 2015, Renasar Technologies Inc.
/* jshint node:true */

'use strict';

describe("Job.Catalog.GenerateSku", function () {

    var injector;
    var waterline = {};
    var taskProtocol = {};
    var RunWorkItems;
    var Q;
    var uuid;

    before(function () {
        var _ = helper.baseInjector.get('_');
        // create a child injector with renasar-core and the base pieces we need to test this
        injector = helper.baseInjector.createChild(_.flatten([
            helper.require('/spec/mocks/logger.js'),
            helper.require('/lib/jobs/base-job.js'),
            helper.require('/lib/jobs/run-work-items.js'),
            dihelper.simpleWrapper(waterline, 'Services.Waterline'),
            dihelper.simpleWrapper(taskProtocol, 'Protocol.Task')
        ]));

        RunWorkItems = injector.get('Job.WorkItems.Run');
        Q = injector.get('Q');
        uuid = injector.get('uuid');
    });

    beforeEach(function () {
        waterline.workitems = {
            startNextScheduled: sinon.stub().returns(Q.resolve()),
            setSucceeded: sinon.stub(),
            setFailed: sinon.stub()
        };
        waterline.nodes = {
            findOne: sinon.stub()
        };
        taskProtocol.publishRunIpmiCommand = sinon.stub().returns(Q.resolve());
        taskProtocol.publishRunSnmpCommand = sinon.stub().returns(Q.resolve());
    });

    it('should run an IPMI Poller work item', function(done) {
        var workItem = {
            id: 'bc7dab7e8fb7d6abf8e7d6ad',
            name: 'Pollers.IPMI',
            config: {
                command: 'sel',
                ip: '1.2.3.4',
                user: 'myuser',
                password: 'mypass'
            }
        };

        var job = new RunWorkItems({}, { graphId: uuid.v4() }, uuid.v4());
        job.on('done', function (err) {
            done(err);
        });
        waterline.workitems.startNextScheduled.onCall(0).returns(Q.resolve(workItem));
        job.run();
        process.nextTick(function () {
            expect(taskProtocol.publishRunIpmiCommand).to.have.been.calledOnce;
            expect(taskProtocol.publishRunIpmiCommand.firstCall.args[1]).to.equal('sel');
            expect(taskProtocol.publishRunIpmiCommand.firstCall.args[2])
                .to.have.property('ip', '1.2.3.4');
            expect(taskProtocol.publishRunIpmiCommand.firstCall.args[2])
                .to.have.property('user', 'myuser');
            expect(taskProtocol.publishRunIpmiCommand.firstCall.args[2])
                .to.have.property('password', 'mypass');

            expect(waterline.workitems.setSucceeded).to.have.been.calledOnce;
            expect(waterline.workitems.setSucceeded.firstCall.args[1]).to.equal(workItem);
            job.cancel();
        });
    });

    it('should run an IPMI Poller work item against a node', function(done) {
        var node = {
            id: 'bc7dab7e8fb7d6abf8e7d6ac',
            obmSettings: [
                {
                    service: 'ipmi-obm-service',
                    config: {
                        ip: '1.2.3.4',
                        user: 'myuser',
                        password: 'mypass'
                    }
                }
            ]
        };
        var workItem = {
            id: 'bc7dab7e8fb7d6abf8e7d6ad',
            name: 'Pollers.IPMI',
            node: node.id,
            config: {
                command: 'power'
            }
        };

        var job = new RunWorkItems({}, { graphId: uuid.v4() }, uuid.v4());
        job.on('done', function (err) {
            done(err);
        });
        waterline.workitems.startNextScheduled.onCall(0).returns(Q.resolve(workItem));
        waterline.nodes.findOne.returns(Q.resolve(node));
        job.run();
        process.nextTick(function () {
            expect(waterline.nodes.findOne).to.have.been.calledOnce;
            expect(waterline.nodes.findOne).to.have.been.calledWith(node.id);

            expect(taskProtocol.publishRunIpmiCommand).to.have.been.calledOnce;
            expect(taskProtocol.publishRunIpmiCommand.firstCall.args[1]).to.equal('power');
            expect(taskProtocol.publishRunIpmiCommand.firstCall.args[2])
                .to.have.property('ip', '1.2.3.4');
            expect(taskProtocol.publishRunIpmiCommand.firstCall.args[2])
                .to.have.property('user', 'myuser');
            expect(taskProtocol.publishRunIpmiCommand.firstCall.args[2])
                .to.have.property('password', 'mypass');

            expect(waterline.workitems.setSucceeded).to.have.been.calledOnce;
            expect(waterline.workitems.setSucceeded.firstCall.args[1]).to.equal(workItem);
            job.cancel();
        });
    });

    it('should run an SNMP Poller work item', function(done) {
        var workItem = {
            id: 'bc7dab7e8fb7d6abf8e7d6ad',
            name: 'Pollers.SNMP',
            config: {
                ip: '1.2.3.4',
                communityString: 'hello'
            }
        };

        var job = new RunWorkItems({}, { graphId: uuid.v4() }, uuid.v4());
        job.on('done', function (err) {
            done(err);
        });
        waterline.workitems.startNextScheduled.onCall(0).returns(Q.resolve(workItem));
        job.run();
        process.nextTick(function () {
            expect(taskProtocol.publishRunSnmpCommand).to.have.been.calledOnce;
            expect(taskProtocol.publishRunSnmpCommand.firstCall.args[1])
                .to.have.property('ip', '1.2.3.4');
            expect(taskProtocol.publishRunSnmpCommand.firstCall.args[1])
                .to.have.property('communityString', 'hello');

            expect(waterline.workitems.setSucceeded).to.have.been.calledOnce;
            expect(waterline.workitems.setSucceeded.firstCall.args[1]).to.equal(workItem);
            job.cancel();
        });
    });

    it('should mark an unknown work item as failed', function(done) {
        var workItem = {
            id: 'bc7dab7e8fb7d6abf8e7d6ad',
            name: 'Bad Work Item'
        };

        var job = new RunWorkItems({}, { graphId: uuid.v4() }, uuid.v4());
        job.on('done', function (err) {
            done(err);
        });
        waterline.workitems.startNextScheduled.onCall(0).returns(Q.resolve(workItem));
        job.run();
        process.nextTick(function () {
            expect(waterline.workitems.setFailed).to.have.been.calledOnce;
            expect(waterline.workitems.setFailed.firstCall.args[1]).to.equal(workItem);
            job.cancel();
        });
    });
});


