// Copyright 2017, DELL EMC, Inc.

'use strict';

describe('Redfish Discovery List Job', function () {
    var uuid = require('node-uuid'),
        sandbox = sinon.sandbox.create(),
        graphId = uuid.v4(),
        redfishJob,
        redfishTool,
        rootData,
        listChassisData,
        getChassisData,
        listSystemData,
        getSystemData,
        ethernetInterfaces,
        listCoolingData,
        getCoolingData,
        listPowerData,
        getPowerData,
        listNetworkData,
        getNetworkData,
        waterline = {},
        Job,
        Error;


    var endpointListSingle = [
        {
            uri: 'http://1.2.3.4:443/redfish/v1',
            username: 'abc',
            password: 'xyz'
        }
    ];

    var endpointList = [
        {
            uri: 'http://1.2.3.4:443/redfish/v1',
            username: 'abc',
            password: 'xyz'
        },
        {
            uri: 'http://1.2.3.5:443/redfish/v1',
            username: 'abc',
            password: 'xyz'
        }
    ];
    var obm = {
        service: 'redfish-obm-service',
        config: {root: '/fake'}
    };

    var node = {
        id: 'abc',
        type: 'enclosure',
        name: 'Node',
        identifiers: [],
        relations: [
            {
                relationType: 'encloses',
                targets: ['/fake']
            },
            {
                relationType: 'enclosedBy',
                targets: ['/fake']
            }
        ]
    };

    var settings = {
        uri: 'http://1.2.3.7:443/redfish/v1',
        host: 'dummy',
        root: '/redfish/v1' + '/',
        port: 8888,
        protocol: 'dummy',
        username: 'bob',
        password: 'bobpw',
        verifySSL: false
    };

    before(function () {
        helper.setupInjector([
            helper.require('/lib/jobs/base-job.js'),
            helper.require('/lib/jobs/redfish-discovery-list.js'),
            helper.require('/lib/utils/job-utils/redfish-tool.js'),
            helper.di.simpleWrapper(waterline, 'Services.Waterline')
        ]);
        waterline.nodes = {
            create: sandbox.stub().resolves(),
            needOne: sandbox.stub().resolves(node),
            updateOne: sandbox.stub().resolves(node)
        };
        waterline.obms = {
            upsertByNode: sandbox.stub().resolves(obm),
            findByNode: sandbox.stub().resolves(obm)
        };
        waterline.lookups = {
            upsertNodeToMacAddress: sandbox.stub().resolves()
        };
        Error = helper.injector.get('Errors');
    });

    afterEach(function () {
        sandbox.restore();
    });

    beforeEach(function () {
        Job = helper.injector.get('Job.Redfish.Discovery.List');
        redfishJob = new Job({
            uri: 'https://1.1.1.1/redfish/v1',
            username: 'user',
            password: 'pass'
        }, {}, graphId);
        sandbox.stub(redfishJob.redfish);
        redfishTool = redfishJob.redfish;
        redfishJob.settings = settings;
        redfishTool.settings = settings;
        rootData = {
            body: {
                Chassis: {'@odata.id': '/redfish/v1/Chassis'},
                Systems: {'@odata.id': '/redfish/v1/Systems'},
                NetworkDevices: {'@odata.id': '/redfish/v1/NetworkDevices'},
                DCIMCooling: {'@odata.id': '/redfish/v1/DCIMCooling'},
                DCIMPower: {'@odata.id': '/redfish/v1/DCIMPower'}
            }
        };
        listChassisData = {
            body: {
                Members: [
                    {'@odata.id': '/redfish/v1/Chassis/abc123'}
                ]
            }
        };
        getChassisData = {
            body: {
                Links: {
                    ComputerSystems: [
                        {'@odata.id': '/redfish/v1/Systems/abc123'}
                    ]
                },
                Name: 'Computer System Chassis'
            }
        };

        listCoolingData = {
            body: {
                Members: [
                    {'@odata.id': '/redfish/v1/DCIMCooling/abc123'}
                ]
            }
        };

        getCoolingData = {
            body: {
                Links: {
                    Chassis: [
                        {}
                    ],
                    ManagedBy: [
                        {
                            '@odata.id': '/redfish/v1/Managers/BMC'
                        }
                    ],
                    RelatedSystems: [
                        {}
                    ]
                },
                Name: 'DCIMCooling Default Domain'
            }
        };

        listNetworkData = {
            body: {
                Members: [
                    {'@odata.id': '/redfish/v1/NetworkDevices/abc123'}
                ]
            }
        };

        getNetworkData = {
            body: {
                Name: 'Network Device Collection'
            }
        };

        listSystemData = {
            body: {
                Members: [
                    {'@odata.id': '/redfish/v1/Systems/abc123'}
                ]
            }
        };
        ethernetInterfaces = {
            body: {
                Members: []
            }
        };
        getSystemData = {
            body: {
                Links: {
                    Chassis: [
                        {'@odata.id': '/redfish/v1/Chassis/abc123'}
                    ]
                },
                EthernetInterfaces: {
                    '@odata.id': '/redfish/v1/Systems/abc123/EthernetInterfaces'
                },
                Name: 'System'
            }
        };
    });

    describe('redfish discovery', function () {
        it('should successfully run job', function () {
            sandbox.stub(Job.prototype, "createChassis");
            sandbox.stub(Job.prototype, "createSystems");
            sandbox.stub(Job.prototype, "createRedfishNode");
            sandbox.stub(Job.prototype, "createNetwork");
            redfishJob.endpointList = endpointList;
            redfishTool.clientRequest.resolves(rootData);
            redfishJob._run();
            return redfishJob._deferred
                .then(function () {
                    expect(Job.prototype.createChassis).to.be.calledTwice;
                });
        });

        it('should fail to run job', function () {
            redfishJob.endpointList = endpointListSingle;
            redfishTool.clientRequest.rejects('some error');
            redfishJob._run();
            return redfishJob._deferred.should.be.rejectedWith('some error');
        });
    });

    describe('redfish chassis', function () {
        it('should create chassis node', function () {
            redfishTool.clientRequest.onCall(0).resolves(listChassisData);
            redfishTool.clientRequest.onCall(1).resolves(getChassisData);
            return redfishJob.createChassis(rootData.body)
                .then(function () {
                    expect(waterline.nodes.updateOne).to.be.called.once;
                });
        });

        it('should log no system members found warning', function () {
            delete getChassisData.body.Links;
            redfishTool.clientRequest.onCall(0).resolves(listChassisData);
            redfishTool.clientRequest.onCall(1).resolves(getChassisData);
            return redfishJob.createChassis(rootData.body)
                .then(function () {
                    expect(waterline.nodes.updateOne).to.be.called.once;
                });
        });

        it('should fail to create chassis node', function () {
            return expect(redfishJob.createChassis.bind(redfishJob, {}))
                .to.throw('No Chassis Members Found');
        });
    });

    describe('redfish system', function () {
        it('should create system node', function () {
            ethernetInterfaces.body.Members = [
                {'@odata.id': '/redfish/v1/Systems/abc123/EthernetInterfaces'}
            ];
            redfishTool.clientRequest.onCall(0).resolves(listSystemData);
            redfishTool.clientRequest.onCall(1).resolves(getSystemData);
            redfishTool.clientRequest.onCall(2).resolves(getSystemData);
            redfishTool.clientRequest.onCall(3).resolves(ethernetInterfaces);
            redfishTool.clientRequest.onCall(4).resolves({
                body: {'MACAddress': '00:01:02:03:04:05'}
            });
            return redfishJob.createSystems(rootData.body)
                .then(function () {
                    expect(waterline.nodes.updateOne).to.be.called.once;
                });
        });

        it('should log no chassis members found warning', function () {
            delete getSystemData.body.Links;
            redfishTool.clientRequest.onCall(0).resolves(listSystemData);
            redfishTool.clientRequest.onCall(1).resolves(getSystemData);
            redfishTool.clientRequest.onCall(2).resolves(getSystemData);
            redfishTool.clientRequest.onCall(3).resolves(ethernetInterfaces);
            return redfishJob.createSystems(rootData.body)
                .then(function () {
                    expect(waterline.nodes.updateOne).to.be.called.once;
                });
        });

        it('should skip create system node', function () {
            return expect(redfishJob.createSystems({})).to.be.fullfilled;
        });

        it('should fail to create system node', function () {
            redfishTool.clientRequest.onCall(0).rejects('some error');
            return expect(redfishJob.createSystems(rootData.body))
                .to.be.rejectedWith('some error');
        });
    });

    describe('redfish cooling', function () {
        it('should create cooling node', function () {
            redfishTool.clientRequest.onCall(0).resolves(listCoolingData);
            redfishTool.clientRequest.onCall(1).resolves(getCoolingData);
            return redfishJob.createRedfishNode(rootData.body,
                'DCIMCooling',
                ['CRAH', 'CRAC', 'AirHandlingUnit', 'Chiller', 'CoolingTower'],
                'cooling')
                .then(function () {
                    expect(waterline.nodes.updateOne).to.be.called.once;
                });
        });

        it('should fail to create cooling node', function () {
            return redfishJob.createRedfishNode()
                .then(function (out) {
                    expect(out).to.be.an('Array').with.length(0);
                });
        });
    });

    describe('redfish power', function () {
        it('should create power node', function () {
            redfishTool.clientRequest.onCall(0).resolves(listPowerData);
            redfishTool.clientRequest.onCall(1).resolves(getPowerData);
            return redfishJob.createRedfishNode(rootData.body,
                'DCIMPower',
                ['Generator', 'TransferSwitch', 'PDU', 'Rectifier',
                    'UPS', 'RackPDU', 'Transformer', 'Switchgear', 'VFD'],
                'power')
                .then(function () {
                    expect(waterline.nodes.updateOne).to.be.called.once;
                });
        });

        it('should fail to create cooling node', function () {
            return redfishJob.createRedfishNode()
                .then(function (out) {
                    expect(out).to.be.an('Array').with.length(0);
                });
        });
    });

    describe('redfish network', function () {
        it('should create switch node', function () {
            redfishTool.clientRequest.onCall(0).resolves(listNetworkData);
            redfishTool.clientRequest.onCall(1).resolves(getNetworkData);
            return redfishJob.createNetwork(rootData.body)
                .then(function () {
                    expect(waterline.nodes.updateOne).to.be.called.once;
                });
        });

        it('should log no system members found warning', function () {
            delete getNetworkData.body.Links;
            redfishTool.clientRequest.onCall(0).resolves(listNetworkData);
            redfishTool.clientRequest.onCall(1).resolves(getNetworkData);
            return redfishJob.createNetwork(rootData.body)
                .then(function () {
                    expect(waterline.nodes.updateOne).to.be.called.once;
                });
        });

        it('should fail to create network node', function () {
            redfishTool.clientRequest.onCall(0).rejects('some error');
            return expect(redfishJob.createNetwork(rootData.body))
                .to.be.rejectedWith('some error');
        });
    });

    describe('redfish discovery upserts', function () {
        it('should create new node', function () {
            var error = new Error.NotFoundError();
            waterline.nodes.needOne.rejects(error);
            return redfishJob.upsertRelations(node, [])
                .then(function () {
                    expect(waterline.nodes.create).to.be.called.once;
                });
        });

        it('should reject', function () {
            waterline.nodes.needOne.rejects('some error');
            return expect(redfishJob.upsertRelations(node, []))
                .to.be.rejectedWith('some error');
        });

    });
});
