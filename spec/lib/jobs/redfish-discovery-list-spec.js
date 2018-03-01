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
        listManagersData,
        getManagersData,
        waterline = {},
        Job,
        eventsProtocol = {},
        Error,
        request = require('requestretry');


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
            },
            {
                info: null,
                relationType: "managedBy",
                targets: [
                    "5a09dadfcd6a2a01006f4f89"
                ]
            }
        ]
    };

   var redfishNode = {
        id: "5a09dadfcd6a2a01006f4f87",
        identifiers: [
            "System.Embedded.1",
            "http://172.23.0.1:8000/redfish/v1/Systems/System.Embedded.1",
            "NNRZST2-CN747517150043"
        ],
        name: "System",
        obms: [
            {
                ref: "/api/2.0/obms/5a09dadfcd6a2a01006f4f88",
                service: "redfish-obm-service"
            }
        ],
        relations: [
            {
                info: null,
                relationType: "managedBy",
                targets: [
                    "5a09dadfcd6a2a01006f4f89"
                ]
            }
        ],
        type: "redfish"
    };

    var redfishManager = {
        id: "5a09dadfcd6a2a01006f4f89",
        identifiers: [
            "iDRAC.Embedded.1",
            "http://172.23.0.1:8000/redfish/v1/Managers/iDRAC.Embedded.1"
        ],
        name: "Manager",
        obms: [
            {
                ref: "/api/2.0/obms/5a09dadfcd6a2a01006f4f8a",
                service: "redfish-obm-service"
            }
        ],
        relations: [
            {
                info: null,
                relationType: "manages",
                targets: [
                    "5a09dadfcd6a2a01006f4f87"
                ]
            }
        ],
        type: "redfishManager"
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
        eventsProtocol = helper.injector.get('Protocol.Events');
        sandbox.stub(eventsProtocol, 'publishNodeEvent').resolves();
        redfishJob = new Job({
            uri: 'https://1.1.1.1/redfish/v1',
            username: 'user',
            password: 'pass'
        }, {}, graphId);
        sandbox.stub(request, "get");
        redfishTool = {"settings": {}};
        redfishJob.settings = settings;
        redfishTool.settings = settings;
        rootData = {
            body: {
                Chassis: {'@odata.id': '/redfish/v1/Chassis'},
                Systems: {'@odata.id': '/redfish/v1/Systems'},
                NetworkDevices: {'@odata.id': '/redfish/v1/NetworkDevices'},
                DCIMCooling: {'@odata.id': '/redfish/v1/DCIMCooling'},
                DCIMPower: {'@odata.id': '/redfish/v1/DCIMPower'},
                Managers: {'@odata.id': '/redfish/v1/Managers'}
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
        listManagersData = {
            body: {
                Members: [
                    {'@odata.id': '/redfish/v1/Managers/abc123'}
                ]
            }
        };
        getManagersData = {
            body: {
                Links: {
                    ManagerForServer: [
                        {'@odata.id': '/redfish/v1/Systems/abc123'}
                    ],
                    ManagerForChassis: [
                        {'@odata.id': '/redfish/v1/Chassiss/abc123'}
                    ]
                },
                Name: 'Manager'
           }
        };
    });

    describe('redfish discovery', function () {
        it('should successfully run job', function () {
            sandbox.stub(Job.prototype, "createChassis").resolves([]);
            sandbox.stub(Job.prototype, "createSystems").resolves([redfishNode]);
            sandbox.stub(Job.prototype, "createRedfishNode");
            sandbox.stub(Job.prototype, "createNetwork");
            sandbox.stub(Job.prototype, "createManagers").resolves([redfishManager]);
            redfishJob.endpointList = endpointList;
            request.get.resolves(rootData);
            redfishJob._run();
            return redfishJob._deferred
                .then(function () {
                    expect(Job.prototype.createChassis).to.be.calledTwice;
                });
        });

    });

    describe('redfish chassis', function () {
        it('should create chassis node', function () {
            request.get.onCall(0).resolves(listChassisData);
            request.get.onCall(1).resolves(getChassisData);
            request.get.onCall(1).resolves(getSystemData);
            return redfishJob.createChassis(rootData.body, redfishTool)
                .then(function () {
                    expect(waterline.nodes.updateOne).to.be.called.once;
                });
        });

        it('should log no system members found warning', function () {
            delete getChassisData.body.Links;
            request.get.onCall(0).resolves(listChassisData);
            request.get.onCall(1).resolves(getChassisData);
            return redfishJob.createChassis(rootData.body, redfishTool)
                .then(function () {
                    expect(waterline.nodes.updateOne).to.be.called.once;
                });
        });

        it('should fail to create chassis node', function () {
            return expect(redfishJob.createChassis.bind(redfishJob, redfishTool, {}))
                .to.throw('No Chassis Members Found');
        });
    });

    describe('redfish system', function () {
        it('should create system node', function () {
            ethernetInterfaces.body.Members = [
                {'@odata.id': '/redfish/v1/Systems/abc123/EthernetInterfaces'}
            ];
            request.get.onCall(0).resolves(listSystemData);
            request.get.onCall(1).resolves(getSystemData);
            request.get.onCall(2).resolves(getSystemData);
            request.get.onCall(3).resolves(ethernetInterfaces);
            request.get.onCall(4).resolves({
                body: {'MACAddress': '00:01:02:03:04:05'}
            });
            return redfishJob.createSystems(rootData.body, redfishTool)
                .then(function () {
                    expect(waterline.nodes.updateOne).to.be.called.once;
                });
        });

        it('should log no chassis members found warning', function () {
            delete getSystemData.body.Links;
            request.get.onCall(0).resolves(listSystemData);
            request.get.onCall(1).resolves(getSystemData);
            request.get.onCall(2).resolves(getSystemData);
            request.get.onCall(3).resolves(ethernetInterfaces);
            return redfishJob.createSystems(rootData.body, redfishTool)
                .then(function () {
                    expect(waterline.nodes.updateOne).to.be.called.once;
                });
        });

        it('should skip create system node', function () {
            return expect(redfishJob.createSystems({})).to.be.fullfilled;
        });

        it('should fail to create system node', function () {
            request.get.onCall(0).rejects('some error');
            return expect(redfishJob.createSystems(rootData.body, redfishTool))
                .to.be.rejectedWith('some error');
        });
    });

    describe('redfish cooling', function () {
        it('should create cooling node', function () {
            request.get.onCall(0).resolves(listCoolingData);
            request.get.onCall(1).resolves(getCoolingData);
            return redfishJob.createRedfishNode(rootData.body,
                'DCIMCooling',
                ['CRAH', 'CRAC', 'AirHandlingUnit', 'Chiller', 'CoolingTower'],
                'cooling', redfishTool)
                .then(function () {
                    expect(waterline.nodes.updateOne).to.be.called.once;
                });
        });

        it('should fail to create cooling node', function () {
            return redfishJob.createRedfishNode(null, null, null, null, redfishTool)
                .then(function (out) {
                    expect(out).to.be.an('Array').with.length(0);
                });
        });
    });

    describe('redfish power', function () {
        it('should create power node', function () {
            request.get.onCall(0).resolves(listPowerData);
            request.get.onCall(1).resolves(getPowerData);
            return redfishJob.createRedfishNode(rootData.body,
                'DCIMPower',
                ['Generator', 'TransferSwitch', 'PDU', 'Rectifier',
                    'UPS', 'RackPDU', 'Transformer', 'Switchgear', 'VFD'],
                'power', redfishTool)
                .then(function () {
                    expect(waterline.nodes.updateOne).to.be.called.once;
                });
        });

        it('should fail to create cooling node', function () {
            return redfishJob.createRedfishNode(null, null, null, null, redfishTool)
                .then(function (out) {
                    expect(out).to.be.an('Array').with.length(0);
                });
        });
    });

    describe('redfish network', function () {
        it('should create switch node', function () {
            request.get.onCall(0).resolves(listNetworkData);
            request.get.onCall(1).resolves(getNetworkData);
            return redfishJob.createNetwork(rootData.body, redfishTool)
                .then(function () {
                    expect(waterline.nodes.updateOne).to.be.called.once;
                });
        });

        it('should log no system members found warning', function () {
            delete getNetworkData.body.Links;
            request.get.onCall(0).resolves(listNetworkData);
            request.get.onCall(1).resolves(getNetworkData);
            return redfishJob.createNetwork(rootData.body, redfishTool)
                .then(function () {
                    expect(waterline.nodes.updateOne).to.be.called.once;
                });
        });

        it('should fail to create network node', function () {
            request.get.onCall(0).rejects('some error');
            return expect(redfishJob.createNetwork(rootData.body, redfishTool))
                .to.be.rejectedWith('some error');
        });
    });

    describe('redfish managers', function () {
        it('should create manages node', function () {
            request.get.onCall(0).resolves(listManagersData);
            request.get.onCall(1).resolves(getManagersData);
            return redfishJob.createManagers(rootData.body, redfishTool)
                .then(function () {
                    expect(waterline.nodes.updateOne).to.be.called.once;
                });
        });

        it('should log no system members found warning', function () {
            delete getManagersData.body.Links;
            request.get.onCall(0).resolves(listManagersData);
            request.get.onCall(1).resolves(getManagersData);
            return redfishJob.createManagers(rootData.body, redfishTool)
                .then(function () {
                    expect(waterline.nodes.updateOne).to.be.called.once;
                });
        });

        it('should fail to create Managers node', function () {
            request.get.onCall(0).rejects('some error');
            return expect(redfishJob.createManagers(rootData.body, redfishTool))
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
