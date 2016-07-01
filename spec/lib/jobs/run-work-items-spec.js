// Copyright 2015, EMC, Inc.
/* jshint node:true */

'use strict';

describe("Job.Catalog.RunWorkItem", function () {
    var waterline = {};
    var taskProtocol = {};
    var RunWorkItems;
    var uuid;

    before(function () {
        // create a child injector with on-core and the base pieces we need to test this
        helper.setupInjector([
            helper.require('/spec/mocks/logger.js'),
            helper.require('/lib/jobs/base-job.js'),
            helper.require('/lib/jobs/run-work-items.js'),
            helper.di.simpleWrapper(waterline, 'Services.Waterline'),
            helper.di.simpleWrapper(taskProtocol, 'Protocol.Task')
        ]);

        RunWorkItems = helper.injector.get('Job.WorkItems.Run');
        uuid = helper.injector.get('uuid');
        
        taskProtocol.publishRunIpmiCommand = sinon.stub().resolves();
        taskProtocol.publishRunSnmpCommand = sinon.stub().resolves();
        
        waterline.workitems = {
            startNextScheduled: sinon.stub().resolves(),
            setSucceeded: sinon.stub(),
            setFailed: sinon.stub(),
            update: sinon.stub()
        };
        waterline.nodes = {
            findOne: sinon.stub()
        };
        waterline.obms = {
            findByNode: sinon.stub()
        };
    });

    beforeEach(function () {
        waterline.workitems.startNextScheduled.reset();
        waterline.workitems.setSucceeded.reset();
        waterline.workitems.setFailed.reset();
        waterline.nodes.findOne.reset();
        waterline.obms.findByNode.reset();
        taskProtocol.publishRunIpmiCommand.reset();
        taskProtocol.publishRunSnmpCommand.reset();
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

        waterline.workitems.startNextScheduled.onCall(0).resolves(workItem);
        job.run();

        // This is guaranteed to run because job._deferred won't resolve until
        // we call job.cancel()
        setImmediate(function () {
            try {
                expect(taskProtocol.publishRunIpmiCommand).to.have.been.calledOnce;
                expect(taskProtocol.publishRunIpmiCommand.firstCall.args[1]).to.equal('sel');
                expect(taskProtocol.publishRunIpmiCommand.firstCall.args[2])
                    .to.have.property('ip', '1.2.3.4');
                expect(taskProtocol.publishRunIpmiCommand.firstCall.args[2])
                    .to.have.property('user', 'myuser');
                expect(taskProtocol.publishRunIpmiCommand.firstCall.args[2])
                    .to.have.property('password', 'mypass');

                job.cancel();
                done();
            } catch (e) {
                done(e);
            }
        });

        return job._deferred;
    });

    it('should run an IPMI Poller work item against a node', function(done) {
        var node = {
            id: 'bc7dab7e8fb7d6abf8e7d6ac',
        };
        var obm = {
            node: 'bc7dab7e8fb7d6abf8e7d6ac',
            config: {}
        };
        var workItem = {
            id: 'bc7dab7e8fb7d6abf8e7d6ad',
            name: 'Pollers.IPMI',
            node: node.id,
            config: {
                command: 'power',
                ip: '1.2.3.4',
                user: 'myuser',
                password: 'mypass'
            }
        };

        var job = new RunWorkItems({}, { graphId: uuid.v4() }, uuid.v4());

        waterline.workitems.startNextScheduled.onCall(0).resolves(workItem);
        waterline.nodes.findOne.resolves(node);
        waterline.obms.findByNode.resolves(obm);
        job.run();

        // This is guaranteed to run because job._deferred won't resolve until
        // we call job.cancel()
        setImmediate(function () {
            try {
                expect(taskProtocol.publishRunIpmiCommand).to.have.been.calledOnce;
                expect(taskProtocol.publishRunIpmiCommand.firstCall.args[1]).to.equal('power');
                expect(taskProtocol.publishRunIpmiCommand.firstCall.args[2])
                    .to.have.property('ip', '1.2.3.4');
                expect(taskProtocol.publishRunIpmiCommand.firstCall.args[2])
                    .to.have.property('user', 'myuser');
                expect(taskProtocol.publishRunIpmiCommand.firstCall.args[2])
                    .to.have.property('password', 'mypass');
                expect(taskProtocol.publishRunIpmiCommand.firstCall.args[2])
                    .to.have.property('node', node.id);

                job.cancel();
                done();
            } catch (e) {
                done(e);
            }
        }, 1000);
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

        waterline.workitems.startNextScheduled.onCall(0).resolves(workItem);

        job.run();

        setImmediate(function () {
            try {
                expect(taskProtocol.publishRunSnmpCommand).to.have.been.calledOnce;
                expect(taskProtocol.publishRunSnmpCommand.firstCall.args[1].config)
                    .to.have.property('ip', '1.2.3.4');
                expect(taskProtocol.publishRunSnmpCommand.firstCall.args[1].config)
                    .to.have.property('communityString', 'hello');

                job.cancel();
                done();
            } catch (e) {
                done(e);
            }
        });
    });
    
    it('should run a Redfish Poller work item', function(done) {
        var workItem = {
            id: 'bc7dab7e8fb7d6abf8e7d6ad',
            name: 'Pollers.Redfish',
            config: {
                uri: 'http://testapi',
                username: 'user',
                password: 'password',
                command: 'power'
            }
        };

        var job = new RunWorkItems({}, { graphId: uuid.v4() }, uuid.v4());
        waterline.workitems.startNextScheduled.onCall(0).resolves(workItem);
        job._publishRunRedfishCommand = sinon.stub().resolves();
        
        job.run();
        setImmediate(function () {
            try {
                expect(job._publishRunRedfishCommand).to.have.been.calledOnce;
                expect(job._publishRunRedfishCommand.firstCall.args[1].config)
                    .to.have.property('uri', 'http://testapi');
                expect(job._publishRunRedfishCommand.firstCall.args[1].config)
                    .to.have.property('username', 'user');
                expect(job._publishRunRedfishCommand.firstCall.args[1].config)
                    .to.have.property('password', 'password');
                job.cancel();
                done();
            } catch (e) {
                done(e);
            }
        });
    });


    it('should mark an unknown work item as failed', function(done) {
        var workItem = {
            id: 'bc7dab7e8fb7d6abf8e7d6ad',
            name: 'Bad Work Item'
        };

        var job = new RunWorkItems({}, { graphId: uuid.v4() }, uuid.v4());

        waterline.workitems.startNextScheduled.onCall(0).resolves(workItem);
        job.run();

        setImmediate(function () {
            try {
                expect(waterline.workitems.setFailed).to.have.been.calledOnce;
                expect(waterline.workitems.setFailed.firstCall.args[2]).to.equal(workItem);
                job.cancel();
                done();
            } catch (e) {
                done(e);
            }
        });
    });
});


