// Copyright 2015, EMC, Inc.
/* jshint node:true */

'use strict';

describe("Job.Pollers.CreateDefault", function () {
    var waterline = {};
    var taskProtocol = {};
    var CreateDefaultPollers;
    var pollers;
    var Promise;
    var uuid;
    var souceQueryString = {or: [
        {source: {startsWith: 'bmc'}},
        {source: 'UCS:boardController'},
        {source: 'rmm'}
    ]};

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
        this.sandbox = sinon.sandbox.create();
    });

    beforeEach(function () {
        waterline.workitems = {
            findOrCreate: this.sandbox.stub().resolves()
        };
        waterline.catalogs = {
            findMostRecent: this.sandbox.stub().resolves({
                id: 'bc7dab7e8fb7d6abf8e7d6a1'
            })
        };
        waterline.obms = {
            findByNode: this.sandbox.stub().resolves({
                service: 'redfish-obm-service',
                config: {}
            })
        };
        taskProtocol.subscribeActiveTaskExists = this.sandbox.stub().returns(Promise.resolve({
            dispose: this.sandbox.stub()
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

    afterEach(function () {
        this.sandbox.restore();
    });

    it('should create pollers for a job with options.nodeId', function () {
        var nodeId = 'bc7dab7e8fb7d6abf8e7d6ad';
        var queryString = _.merge({node: nodeId}, souceQueryString);

        var job = new CreateDefaultPollers(
            { nodeId: nodeId, pollers: pollers },
            { graphId: uuid.v4() },
            uuid.v4()
        );

        return job.run()
        .then(function() {
            expect(waterline.catalogs.findMostRecent).to.have.been.calledOnce;
            expect(waterline.catalogs.findMostRecent.firstCall.args[0])
                .to.be.deep.equals(queryString);
            expect(waterline.workitems.findOrCreate).to.have.been.calledOnce;
            expect(waterline.workitems.findOrCreate).to.have.been.calledWith(
                { node: nodeId, 'config.command': pollers[0].config.command });
        });
    });

    it('should create pollers for a job with context.target', function () {
        var nodeId = 'bc7dab7e8fb7d6abf8e7d6af';
        var queryString = _.merge({node: nodeId}, souceQueryString);

        var job = new CreateDefaultPollers(
            { pollers: pollers },
            { target: nodeId, graphId: uuid.v4() },
            uuid.v4()
        );

        return job.run()
        .then(function() {
            expect(waterline.catalogs.findMostRecent).to.have.been.calledOnce;
            expect(waterline.catalogs.findMostRecent.firstCall.args[0])
                .to.be.deep.equals(queryString);
            expect(waterline.workitems.findOrCreate).to.have.been.calledOnce;
            expect(waterline.workitems.findOrCreate).to.have.been.calledWith(
                { node: nodeId, 'config.command': pollers[0].config.command });
        });
    });

    it('should not create pollers when bmc catalog does not exist', function () {
        var nodeId = 'bc7dab7e8fb7d6abf8e7d6af';
        var queryString = _.merge({node: nodeId}, souceQueryString);

        pollers.push({
            "type": "snmp",
            "pollInterval": 60000,
            "config": {
                "metric": "snmp-interface-bandwidth-utilization"
            }
        });

        waterline.catalogs.findMostRecent.resolves();

        var job = new CreateDefaultPollers(
            { pollers: pollers },
            { target: nodeId, graphId: uuid.v4() },
            uuid.v4()
        );

        return job.run()
        .then(function() {
            expect(waterline.catalogs.findMostRecent).to.have.been.calledTwice;
            expect(waterline.catalogs.findMostRecent.firstCall.args[0])
                .to.be.deep.equals(queryString);
            expect(waterline.catalogs.findMostRecent.secondCall.args[0])
                .to.be.deep.equals({"node": "bc7dab7e8fb7d6abf8e7d6af", "source": "snmp-1"});
            expect(waterline.workitems.findOrCreate).to.not.have.been.called;
        });
    });

    it('should create multiple pollers', function () {
        var nodeId = 'bc7dab7e8fb7d6abf8e7d6ad';
        var ipmiQueryString = _.merge({node: nodeId}, souceQueryString);
        var snmpQueryString = _.merge({node: nodeId}, {source: 'snmp-1'});

        pollers.push({
            "type": "snmp",
            "pollInterval": 60000,
            "config": {
                "metric": "snmp-interface-bandwidth-utilization"
            }
        });

        pollers.push({
            "type": "redfish",
            "pollInterval": 60000,
            "config": {
                "command": "thermal"
            }
        });

       pollers.push({
            "type": "redfish",
            "pollInterval": 60000,
            "config": {
                "command": "systems.logservice"
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
                .to.be.deep.equals(ipmiQueryString);
            expect(waterline.catalogs.findMostRecent.secondCall.args[0])
                .to.be.deep.equals(snmpQueryString);
            expect(waterline.workitems.findOrCreate).to.have.been.callCount(4);
            expect(waterline.workitems.findOrCreate).to.have.been.calledWith(
                { node: nodeId, 'config.command': pollers[0].config.command });
            expect(waterline.workitems.findOrCreate).to.have.been.calledWith(
                { node: nodeId, 'config.command': pollers[1].config.command });
        });
    });

    it('should fail on missing redfish service', function () {
        var nodeId = 'bc7dab7e8fb7d6abf8e7d6ad';
        pollers = [{
            "type": "redfish",
            "pollInterval": 60000,
            "config": {
                "command": "thermal"
            }
        }];

        waterline.nodes = {
            needByIdentifier: this.sandbox.stub().resolves({
                obmSettings: []
            })
        };

        waterline.obms.findByNode.resolves();
        var job = new CreateDefaultPollers(
            { nodeId: nodeId, pollers: pollers },
            { graphId: uuid.v4() },
            uuid.v4()
        );

        return expect(job.run())
            .to.be.rejectedWith('Required redfish-obm-service settings are missing.');
    });

    it('should create ucs pollers', function () {
        var nodeIds = ['bc7dab7e8fb7d6abf8e7d6ad','bc7dab7e8fb7d6abf8e7d6ae'];
        var taskId = uuid.v4();
        var pollers = [
            {
                "type": "ucs",
                "pollInterval": 60000,
                "config": {
                    "command": "psu"
                }
            },
            {
                "type": "ucs",
                "pollInterval": 60000,
                "config": {
                    "command": "sel"
                }
            }
        ];
        waterline.obms.findByNode.resolves([{"service": "ucs-obm-service"}]);
        waterline.workitems.findOrCreate.resolves({poller: 'test'});
        var job = new CreateDefaultPollers(
            { nodeId: null, pollers: pollers },
            { graphId: uuid.v4(), physicalNodeList: nodeIds },
            taskId
        );

        return job.run()
        .then(function() {
            expect(waterline.obms.findByNode).to.have.been.callCount(4);
            expect(waterline.workitems.findOrCreate).to.have.been.callCount(4);
            expect(waterline.obms.findByNode).to.have.been.calledWith(
                nodeIds[0], 'ucs-obm-service', true
            );
            expect(waterline.obms.findByNode).to.have.been.calledWith(
                nodeIds[1], 'ucs-obm-service', true
            );

            var arrayLength = pollers.length * nodeIds.length;
            _.forEach(Array.from({length: arrayLength}, function(v, i){ return i; }),
                function(i) {
                    var expectedNodeId = nodeIds[i % pollers.length];
                    var expectedPoller = _.cloneDeep(pollers[parseInt(i / pollers.length)]);
                    expectedPoller.node = expectedNodeId;

                    expect(waterline.workitems.findOrCreate.getCall(i).args[0])
                        .to.deep.equal({node: expectedNodeId,
                            'config.command': expectedPoller.config.command});
                    expect(waterline.workitems.findOrCreate.getCall(i).args[1])
                        .to.deep.equal(expectedPoller);
            });
        });

    });

});

