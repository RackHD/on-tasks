// Copyright 2017 Dell Inc. or its subsidiaries.  All Rights Reserved.

'use strict';

var uuid = require('node-uuid');

describe(require('path').basename(__filename), function () {
    var DiscoveryJob;
    var discoveryJob;
    var configuration;
    var wsmanTool;
    var waterline;
    var logger;
    var errorLoggerSpy;
    var warnLoggerSpy;
    var eventsProtocol;
    var workflowTool;
    var redfishTool;
    var sandbox = sinon.sandbox.create();

    var dellConfigs = {
        gateway: 'https://1.1.1.1:10000',
        services: {
            credentials: {
                userName: 'test',
                password: 'test'
            },
            discovery: {
                range: '/api/1.0/discover/range'
            }
        }
    };

    var options = {
        credentials: {
            userName: 'test',
            password: 'test'
        },
        inventory: true,
        deviceTypesToDiscover: ['SERVER', 'CHASSIS', 'SWITCH'],
        ranges: [{
            startIp: '1.1.1.1',
            endIp: '1.1.1.10',
            credentials: {
                userName: 'test',
                password: 'test'
            }
        },
        {
            startIp: '2.2.2.1',
            endIp: '2.2.2.10',
            deviceTypesToDiscover: ['CHASSIS']
        },
        {
            startIp: '3.3.3.1',
            endIp: '3.3.3.10',
            deviceTypesToDiscover: ['SWITCH'],
            credentials: {
                userName: 'test',
                password: 'test'
            }
        }]
    };

    var serverNodes = {
        deviceGroup: 'SERVER',
        discoveredDeviceList: [
            {
                discovered: 2,
                deviceName: 'name',
                discoveredDeviceInfoList: [
                    {
                        summary: {
                            serviceTag: 'G6CY112',
                            manufacturer: 'Quanta Computer Inc',
                            model: 'Product Name'
                        },
                        macAddress: '11:11:11:11:11:11',
                        ipAddress: '1.1.1.1'
                    },
                    {
                        summary: {
                            serviceTag: null,
                            manufacturer: 'Quanta Computer Inc',
                            model: 'Product Name'
                        },
                        macAddress: '55:55:55:55:55:55',
                        ipAddress: '1.1.1.2'
                    },
                    {
                        summary: {
                            serviceTag: 'G6CY111',
                            manufacturer: 'Quanta Computer Inc',
                            model: 'Product Name'
                        },
                        macAddress: '55.55.55.55.55.54',
                        ipAddress: '1.1.1.3'
                    }
               ]
             }
        ]
    };

    var chassisNodes = {
        deviceGroup: 'CHASSIS',
        discoveredDeviceList: [
            {
                discovered: 1,
                deviceName: 'name',
                discoveredDeviceInfoList: [
                    {
                        summary: {
                            serviceTag: 'G6CY112',
                            manufacturer: 'Quanta Computer Inc',
                            model: 'Product Name'
                        },
                        macAddress: '11:11:11:11:11:1',
                        ipAddress: '2.2.2.1'
                    },
                    {
                        summary: {
                            serviceTag: null,
                            manufacturer: 'Quanta Computer Inc',
                            model: 'Product Name'
                        },
                        macAddress: '11:11:11:11:11:2',
                        ipAddress: '2.2.2.2'
                    },
                    {
                        summary: {
                            serviceTag: 'G6CY113',
                            manufacturer: 'Quanta Computer Inc',
                            model: 'Product Name'
                        },
                        macAddress: '11:11:11:11:11:3',
                        ipAddress: '2.2.2.3'
                    }
                ]
            }
        ]
    };

    var switchNodes = {
        deviceGroup: 'SWITCH',
        discoveredDeviceList: [
            {
                discovered: 1,
                deviceName: 'name',
                discoveredDeviceInfoList: [
                    {
                        summary: {
                            serviceTag: 'G6CY112',
                            manufacturer: 'Quanta Computer Inc',
                            model: 'Product Name'
                        },
                        macAddress: '11:11:11:11:11:21',
                        ipAddress: '3.3.3.1'
                    },
                    {
                        summary: {
                            ServiceTag: 'G6CY113',
                            manufacturer: 'Quanta Computer Inc',
                            model: 'Product Name'
                        },
                        macAddress: '11:11:11:11:11:41',
                        ipAddress: '3.3.3.3'
                    }
                ]
            }
        ]
    };

    var storageNodes = {
        deviceGroup: 'STORAGE',
        discoveredDeviceList: [
            {
                discovered: 1,
                deviceName: 'name',
                discoveredDeviceInfoList: [
                    {
                        summary: {
                            serviceTag: 'G6CY112',
                            manufacturer: 'Quanta Computer Inc',
                            model: 'Product Name'
                        },
                        macAddress: '11:11:11:11:11:22',
                        ipAddress: '4.4.4.1'
                    },
                    {
                        summary: {
                            ServiceTag: 'G6CY113',
                            manufacturer: 'Quanta Computer Inc',
                            model: 'Product Name'
                        },
                        macAddress: '11:11:11:11:11:42',
                        ipAddress: '4.4.4.3'
                    }
                ]
            }
        ]
    };

    var iomNodes = {
        deviceGroup: 'IOM',
        discoveredDeviceList: [
            {
                discovered: 1,
                deviceName: 'name',
                discoveredDeviceInfoList: [
                    {
                        summary: {
                            serviceTag: 'G6CY112',
                            manufacturer: 'Quanta Computer Inc',
                            model: 'Product Name'
                        },
                        macAddress: '11:11:11:11:11:23',
                        ipAddress: '5.5.5.1'
                    },
                    {
                        summary: {
                            ServiceTag: 'G6CY113',
                            manufacturer: 'Quanta Computer Inc',
                            model: 'Product Name'
                        },
                        macAddress: '11:11:11:11:11:43',
                        ipAddress: '5.5.5.3'
                    }
                ]
            }
        ]
    };

    before(function() {
        helper.setupInjector([
            helper.require('/lib/jobs/base-job.js'),
            helper.require('/lib/utils/job-utils/wsman-tool.js'),
            helper.require('/lib/utils/job-utils/workflow-tool.js'),
            helper.require('/lib/utils/job-utils/redfish-tool.js'),
            helper.require('/lib/task-graph.js'),
            helper.require('/lib/task.js'),
            helper.require('/lib/utils/task-option-validator.js'),
            helper.di.simpleWrapper([], 'Task.taskLibrary'),
            helper.require('/lib/jobs/dell-wsman-base-job.js'),
            helper.require('/lib/jobs/dell-wsman-discovery.js')
        ]);
        DiscoveryJob = helper.injector.get('Job.Dell.Wsman.Discovery');
        configuration = helper.injector.get('Services.Configuration');
        wsmanTool = helper.injector.get('JobUtils.WsmanTool');
        waterline = helper.injector.get('Services.Waterline');
        eventsProtocol = helper.injector.get('Protocol.Events');
        workflowTool = helper.injector.get('JobUtils.WorkflowTool');
        redfishTool = helper.injector.get('JobUtils.RedfishTool');
        logger = helper.injector.get('Logger');
        errorLoggerSpy = sinon.spy(logger.prototype, 'error');
        warnLoggerSpy = sinon.spy(logger.prototype, 'warning');
    });

    beforeEach(function() {
        discoveryJob = new DiscoveryJob(options, {}, uuid.v4());
        discoveryJob.options = JSON.parse(JSON.stringify(options));
        discoveryJob.dell = dellConfigs;
        discoveryJob.doInventory = 'true';
        sandbox.stub(configuration, 'get');
        waterline.nodes = {
            create: sandbox.stub(),
            updateByIdentifier: sandbox.stub(),
            findByIdentifier: sandbox.stub(),
            updateOne: sandbox.stub()
        };
        waterline.catalogs = {
            create: sandbox.stub(),
            updateByIdentifier: sandbox.stub(),
            findLatestCatalogOfSource: sandbox.stub()
        };
        waterline.obms = {
            upsertByNode: sandbox.stub()
        };
        sandbox.stub(wsmanTool.prototype, 'clientRequest');
        sandbox.stub(eventsProtocol, 'publishNodeEvent');
        sandbox.stub(workflowTool, 'runGraph').resolves();
        sandbox.stub(redfishTool.prototype, 'clientRequest');
    });

    afterEach(function() {
        sandbox.restore();
        errorLoggerSpy.reset();
        warnLoggerSpy.reset();
    });

    describe('_initJob', function() {
        it('should handle case: dell configuration is incompleted', function() {
            var dellConfigurations = {
                services: {}
            };
            configuration.get.returns(dellConfigurations);
            return expect(function() {
                discoveryJob._initJob();
            }).to.throw('Dell Discovery web service is not defined in wsmanConfig.json.');
        });

        it('should init job successfully', function() {
            configuration.get.returns(dellConfigs);
            discoveryJob._initJob();
            return expect(discoveryJob.dell.services.discovery.range).to.
                be.equal('/api/1.0/discover/range');
        });
    });

    describe('addCatalog', function() {
        it('should create catalog successfully', function() {
            waterline.catalogs.findLatestCatalogOfSource.
                withArgs('59ca21d73a0bb58304df131d', 'DeviceSummary').resolves({});
            waterline.catalogs.create.resolves();
            var node = {
                id: '59ca21d73a0bb58304df131d'
            };
            return expect(discoveryJob.addCatalog(node, {}, 'DeviceSummary')).to.be.fulfilled;
        });

        it('should update catalog successfully', function() {
            waterline.catalogs.findLatestCatalogOfSource.
                withArgs('59ca21d73a0bb58304df131d', 'DeviceSummary').resolves({
                node: '59ca21d73a0bb58304df131d',
                source: 'DeviceSummary',
                data: {}
            });
            waterline.catalogs.updateByIdentifier.resolves();
            var node = {
                id: '59ca21d73a0bb58304df131d'
            };
            return expect(discoveryJob.addCatalog(node, {}, 'DeviceSummary')).to.be.fulfilled;
        });

        it('should handle case: error occurs while updating catalog', function() {
            waterline.catalogs.findLatestCatalogOfSource.
                withArgs('59ca21d73a0bb58304df131d', 'DeviceSummary').resolves({
                node: '59ca21d73a0bb58304df131d',
                source: 'DeviceSummary',
                data: {}
            });
            waterline.catalogs.updateByIdentifier.rejects('fake error');
            var node = {
                id: '59ca21d73a0bb58304df131d'
            };
            return discoveryJob.addCatalog(node, {}, 'DeviceSummary').then(function() {
                expect(errorLoggerSpy).to.be.called;
            });
        });
    });

    describe('_handleSyncRequest', function() {
        it('should handle case: range list is empty', function() {
            discoveryJob.options.ranges = [];
            sandbox.stub(DiscoveryJob.prototype, '_done');
            return discoveryJob._handleSyncRequest().should.be.fulfilled
            .then(function() {
                expect(DiscoveryJob.prototype._done).to.be.called;
            });
        });

        it('should handle case: device type to be discovered is not an array', function() {
            discoveryJob.options.deviceTypesToDiscover = 'SERVER, CHASSIS';
            return expect(function() {
                discoveryJob._handleSyncRequest();
            }).to.throw('deviceTypesToDiscover must be an array. ex: ["SERVER", "CHASSIS"]');
        });

        it('should handle case: provided ip range is invalid', function() {
            discoveryJob.options.ranges = [
                {
                    startIp: 'invalid',
                    endIp: 'invalid'
                }
            ];
            return expect(function() {
                discoveryJob._handleSyncRequest();
            }).to.throw('Invalid IP range: (invalid - invalid)');
        });

        it('should handle case: provided device types are invalid', function() {
            discoveryJob.options.ranges = [
                {
                    startIp: '1.1.1.1',
                    endIp: '1.1.1.2',
                    deviceTypesToDiscover: 'SERVER, CHASSIS'
                }
            ];
            return expect(function() {
                discoveryJob._handleSyncRequest();
            }).to.throw('deviceTypesToDiscover must be an array for range: (1.1.1.1 - 1.1.1.2)');
        });

        it('should handle case: no credentials provided for ip range', function() {
            discoveryJob.options.credentials = {};
            return expect(function() {
                discoveryJob._handleSyncRequest();
            }).to.throw('No credentials provided for range: (2.2.2.1 - 2.2.2.10)');
        });

        it('Init variable: doInventory, case: doInventory is undefined', function() {
            discoveryJob.doInventory = undefined;
            wsmanTool.prototype.clientRequest.resolves({
                body: {
                    status: 'OK'
                }
            });
            return expect(discoveryJob._handleSyncRequest()).to.be.fulfilled;
        });

        it('Init variable: doInventory, case: doInventory is true', function() {
            discoveryJob.doInventory = true;
            wsmanTool.prototype.clientRequest.resolves({
                body: {
                    status: 'OK'
                }
            });
            return expect(discoveryJob._handleSyncRequest()).to.be.fulfilled;
        });

        it('Init variable: doInventory, case: doInventory is false', function() {
            discoveryJob.doInventory = false;
            wsmanTool.prototype.clientRequest.resolves({
                body: {
                    status: 'OK'
                }
            });
            return expect(discoveryJob._handleSyncRequest()).to.be.fulfilled;
        });
    });

    describe('_handleSyncResponse', function() {
        it('should handle response successfully', function() {
            sandbox.stub(DiscoveryJob.prototype, 'processChassis').resolves();
            sandbox.stub(DiscoveryJob.prototype, 'processCompute').resolves();
            sandbox.stub(DiscoveryJob.prototype, 'processSwitch').resolves();
            var discoveryResponse = [serverNodes, chassisNodes, switchNodes];
            return expect(discoveryJob._handleSyncResponse(discoveryResponse)).to.be.fulfilled;
        });
    });

    describe('processChassis', function() {
        beforeEach(function() {
            waterline.nodes.findByIdentifier.withArgs('2.2.2.1').resolves();
            waterline.nodes.findByIdentifier.withArgs('2.2.2.3').resolves({
                name: '2.2.2.3',
                type: 'chassis',
                identifier: 'test',
                relations: []
            });
            waterline.nodes.create.resolves({
                id: 'id',
                name: '2.2.2.1',
                relations: [],
                targets: []
            });
            waterline.nodes.updateByIdentifier.resolves();
            waterline.obms.upsertByNode.resolves();
            sandbox.stub(DiscoveryJob.prototype, 'addCatalog').resolves();
            sandbox.stub(DiscoveryJob.prototype, 'createWsmanObm').resolves();
            sandbox.stub(DiscoveryJob.prototype, 'setComputeEnclosureToPhysicalChassisRelations').resolves();
        });

        it('should process chassis node successfully', function() {
            var discoveryResponse = [chassisNodes];
            return expect(discoveryJob._handleSyncResponse(discoveryResponse)).to.be.fulfilled;
        });

        it('should handle case: error occurs while processing chassis node', function() {
            waterline.nodes.findByIdentifier.withArgs('2.2.2.3').rejects('fake error');
            var discoveryResponse = [chassisNodes];
            return discoveryJob._handleSyncResponse(discoveryResponse)
            .then(function() {
                expect(discoveryJob.createWsmanObm).to.be.calledOnce;
                expect(errorLoggerSpy).to.be.calledTwice;
            });
        });
    });

    describe('processCompute', function() {
        beforeEach(function() {
            waterline.nodes.findByIdentifier.withArgs('1.1.1.1').resolves();
            waterline.nodes.findByIdentifier.withArgs('1.1.1.3').resolves({
                name: '1.1.1.3',
                type: 'compute',
                identifier: 'test',
                relations: []
            });
            waterline.nodes.create.onCall(0).resolves({
                id: 'compute',
                name: '1.1.1.3',
                relations: [],
                targets: []
            });
            waterline.nodes.create.onCall(1).resolves({
                id: 'enclosure',
                name: '1.1.1.3',
                relations: [],
                targets: []
            });
            waterline.nodes.updateByIdentifier.resolves();
            waterline.obms.upsertByNode.resolves();
            sandbox.stub(DiscoveryJob.prototype, 'addCatalog').resolves();
            sandbox.stub(DiscoveryJob.prototype, 'createWsmanObm').resolves();
            sandbox.stub(DiscoveryJob.prototype, 'setComputeEnclosureToPhysicalChassisRelations').resolves();
        });

        it('should process chassis node successfully', function() {
            var discoveryResponse = [serverNodes];
            return expect(discoveryJob._handleSyncResponse(discoveryResponse)).to.be.fulfilled;
        });

        it('should handle case: error occurs while processing', function() {
            waterline.nodes.findByIdentifier.withArgs('1.1.1.3').rejects('fake error');
            var discoveryResponse = [serverNodes];
            return discoveryJob._handleSyncResponse(discoveryResponse)
            .then(function() {
                expect(discoveryJob.createWsmanObm).to.be.calledOnce;
                expect(errorLoggerSpy).to.be.calledTwice;
            });
        });
    });

    describe('processSwitch', function() {
        beforeEach(function() {
            waterline.nodes.findByIdentifier.withArgs('3.3.3.1').resolves();
            waterline.nodes.findByIdentifier.withArgs('3.3.3.3').resolves({
                name: '3.3.3.3',
                type: 'switch',
                identifier: 'test',
                relations: 'test'
            });
            waterline.nodes.create.resolves({
                id: 'id',
                name: '3.3.3.3',
                relations: [],
                targets: []
            });
            waterline.nodes.updateByIdentifier.resolves();
            waterline.obms.upsertByNode.resolves();
            sandbox.stub(DiscoveryJob.prototype, 'createDefaultObm').resolves();
            sandbox.stub(DiscoveryJob.prototype, 'setComputeEnclosureToPhysicalChassisRelations').resolves();
        });

        it('should process switch node successfully', function() {
            var discoveryResponse = [switchNodes];
            return expect(discoveryJob._handleSyncResponse(discoveryResponse)).to.be.fulfilled;
        });

        it('should handle case: error occurs while processing switch', function() {
            waterline.nodes.findByIdentifier.withArgs('3.3.3.3').rejects('fake error');
            var discoveryResponse = [switchNodes];
            return discoveryJob._handleSyncResponse(discoveryResponse)
            .then(function() {
                expect(discoveryJob.createDefaultObm).to.be.calledOnce;
                expect (errorLoggerSpy).to.be.calledOnce;
            });
        });
    });

    describe('processStorage', function() {
        beforeEach(function() {
            waterline.nodes.findByIdentifier.withArgs('4.4.4.1').resolves();
            waterline.nodes.findByIdentifier.withArgs('4.4.4.3').resolves({
                name: '4.4.4.3',
                type: 'storage',
                identifier: 'test',
                relations: []
            });
            waterline.nodes.create.onCall(0).resolves({
                id: 'storage',
                name: '4.4.4.1',
                relations: [],
                targets: []
            });
            sandbox.stub(DiscoveryJob.prototype, 'setComputeEnclosureToPhysicalChassisRelations').resolves();
        });

        it('should process storage node successfully', function() {
            return expect(discoveryJob.processStorage(storageNodes.discoveredDeviceList)).to.be.fulfilled;
        });

        it('should handle case: error occurs while processing storages', function() {
            waterline.nodes.findByIdentifier.withArgs('4.4.4.3').rejects('fake error');
            return discoveryJob.processStorage(storageNodes.discoveredDeviceList).should.be.fulfilled
            .then(function() {
                expect(errorLoggerSpy).to.be.calledOnce;
            });
        });
    });

    describe('processIom', function() {
        beforeEach(function() {
            waterline.nodes.findByIdentifier.withArgs('5.5.5.1').resolves();
            waterline.nodes.findByIdentifier.withArgs('5.5.5.3').resolves({
                name: '5.5.5.3',
                type: 'storage',
                identifier: 'test',
                relations: []
            });
            waterline.nodes.create.onCall(0).resolves({
                id: 'storage',
                name: '5.5.5.1',
                relations: [],
                targets: []
            });
            sandbox.stub(DiscoveryJob.prototype, 'setComputeEnclosureToPhysicalChassisRelations').resolves();
        });

        it('should process iom node successfully', function() {
            return expect(discoveryJob.processIom(iomNodes.discoveredDeviceList)).to.be.fulfilled;
        });

        it('should handle case: error occurs while processing ioms', function() {
            waterline.nodes.findByIdentifier.withArgs('5.5.5.3').rejects('fake error');
            return discoveryJob.processIom(iomNodes.discoveredDeviceList).should.be.fulfilled
            .then(function() {
                expect(errorLoggerSpy).to.be.calledOnce;
            });
        });
    });

    describe('createDefaultObm', function() {
        it('should create default obm successfully', function() {
            discoveryJob.generatedRangeRequest = [
                {
                    deviceType: 'SWITCH',
                    deviceStartIp: '1.1.1.1',
                    deviceEndIp: '1.1.1.10',
                    credential: {
                        userName: 'test',
                        password: 'test'
                    }
                }
            ];
            discoveryJob.generateCredentialMapping();
            waterline.obms.upsertByNode.resolves();
            var node = {
                name: '1.1.1.1',
                id: '59c4720870bf1d7c172930db'
            };
            return expect(discoveryJob.createDefaultObm(node, '1.1.1.1')).to.be.fulfilled;
        });
    });

    describe('createWsmanObm', function() {
        it('should create wsman obm successfully', function() {
            discoveryJob.generatedRangeRequest = [
                {
                    deviceType: 'SERVER',
                    deviceStartIp: '1.1.1.1',
                    deviceEndIp: '1.1.1.10',
                    credential: {
                        userName: 'test',
                        password: 'test'
                    }
                }
            ];
            discoveryJob.generateCredentialMapping();
            waterline.obms.upsertByNode.resolves();
            var node = {
                name: '1.1.1.1',
                id: '59c4720870bf1d7c172930db'
            };
            return expect(discoveryJob.createWsmanObm(node, '1.1.1.1')).to.be.fulfilled;
        });
    });

    describe('createRedfishObm', function() {
        it('should create redfish obm successfully', function() {
            redfishTool.prototype.clientRequest.withArgs('/redfish/v1/').resolves({
                body: {
                    Chassis: {
                        '@odata.id': '/redfish/v1/Chassis'
                    }
                }
            });
            redfishTool.prototype.clientRequest.withArgs('/redfish/v1/Chassis').resolves({
                Members: [
                    {
                        "@odata.id": "/redfish/v1/Chassis/59c47399179653761714ed43"
                    }
                ]
            });
            discoveryJob.generatedRangeRequest = [
                {
                    deviceType: 'CHASSIS',
                    deviceStartIp: '1.1.1.1',
                    deviceEndIp: '1.1.1.10',
                    credential: {
                        userName: 'test',
                        password: 'test'
                    }
                }
            ];
            discoveryJob.generateCredentialMapping();
            waterline.obms.upsertByNode.resolves();
            var node = {
                name: '1.1.1.1',
                id: '59c4720870bf1d7c172930db',
                type: 'enclosure'
            };
            return expect(discoveryJob.createRedfishObm(node, '1.1.1.1', 1)).to.be.fulfilled;
        });

        it('should handle case: no chassis redfish type found', function() {
            redfishTool.prototype.clientRequest.withArgs('/redfish/v1/').resolves({
                body: {
                    Managers: {
                        '@odata.id': '/redfish/v1/Managers'
                    }
                }
            });
            discoveryJob.generatedRangeRequest = [
                {
                    deviceType: 'CHASSIS',
                    deviceStartIp: '1.1.1.1',
                    deviceEndIp: '1.1.1.10',
                    credential: {
                        userName: 'test',
                        password: 'test'
                    }
                }
            ];
            discoveryJob.generateCredentialMapping();
            waterline.obms.upsertByNode.resolves();
            var node = {
                name: '1.1.1.1',
                id: '59c4720870bf1d7c172930db',
                type: 'enclosure'
            };
            return expect(discoveryJob.createRedfishObm(node, '1.1.1.1', 1)).to.be.fulfilled;
        });

        it('should handle: error occurred while sending redfish request', function() {
            redfishTool.prototype.clientRequest.rejects('fake error');
            discoveryJob.generatedRangeRequest = [
                {
                    deviceType: 'CHASSIS',
                    deviceStartIp: '1.1.1.1',
                    deviceEndIp: '1.1.1.10',
                    credential: {
                        userName: 'test',
                        password: 'test'
                    }
                }
            ];
            discoveryJob.generateCredentialMapping();
            waterline.obms.upsertByNode.resolves();
            var node = {
                name: '1.1.1.1',
                id: '59c4720870bf1d7c172930db',
                type: 'enclosure'
            };
            return discoveryJob.createRedfishObm(node, '1.1.1.1', 1)
            .then(function(result) {
                expect(result).to.be.equal(undefined);
                expect(errorLoggerSpy).to.be.calledOnce;
            });
        });
    });

    describe('setComputeEnclosureToPhysicalChassisRelations', function() {
        it('should set enclosure successfully', function() {
            waterline.nodes.findByIdentifier.withArgs('node1').resolves({
                id: 'node1',
                relations: [
                    {
                        relationType: 'encloses',
                        targets: [
                            'node2'
                        ]
                    }
                ]
            });
            waterline.nodes.findByIdentifier.withArgs('node2').resolves({
                id: 'node2'
            });
            waterline.catalogs.findLatestCatalogOfSource.withArgs('node2', 'devicesummary').resolves({
                source: 'devicesummary',
                data: {
                    systemGeneration: 'Modular',
                    cmcip: 'chassisnode'
                }
            });
            waterline.nodes.findByIdentifier.withArgs('chassisnode').resolves({
                name: 'chassis',
                id: 'node3',
                relations: [
                ]
            });
            waterline.nodes.updateOne.resolves();
            return expect(discoveryJob.setComputeEnclosureToPhysicalChassisRelations('node1')).to.be.fulfilled;
        });

        it('should handle case: no enclose no found', function() {
            waterline.nodes.findByIdentifier.withArgs('node1').resolves({
                id: 'node1',
                relations: [
                    {
                        relationType: 'enclosed',
                        targets: [
                            'node2'
                        ]
                    }
                ]
            });
            return expect(discoveryJob.setComputeEnclosureToPhysicalChassisRelations('node1')).to.be.fulfilled;
        });

        it('should handle case: unknown system type', function() {
            waterline.nodes.findByIdentifier.withArgs('node1').resolves({
                id: 'node1',
                relations: [
                    {
                        relationType: 'encloses',
                        targets: [
                            'node2'
                        ]
                    }
                ]
            });
            waterline.nodes.findByIdentifier.withArgs('node2').resolves({
                id: 'node2'
            });
            waterline.catalogs.findLatestCatalogOfSource.withArgs('node2', 'devicesummary').resolves({
                source: 'devicesummary',
                data: {
                    systemGeneration: null,
                }
            });
            waterline.nodes.findByIdentifier.withArgs('chassisnode').resolves({
                name: 'chassis',
                id: 'node3',
                relations: [
                ]
            });
            return discoveryJob.setComputeEnclosureToPhysicalChassisRelations('node1').should.be.fulfilled
            .then(function() {
                expect(errorLoggerSpy).to.be.calledOnce;
            });
        });

        it('should handle case: Physical chassis not found', function() {
            waterline.nodes.findByIdentifier.withArgs('node1').resolves({
                id: 'node1',
                relations: [
                    {
                        relationType: 'encloses',
                        targets: [
                            'node2'
                        ]
                    }
                ]
            });
            waterline.nodes.findByIdentifier.withArgs('node2').resolves({
                id: 'node2'
            });
            waterline.catalogs.findLatestCatalogOfSource.withArgs('node2', 'devicesummary').resolves({
                source: 'devicesummary',
                data: {
                    systemGeneration: 'Modular',
                    cmcip: 'chassisnode'
                }
            });
            waterline.nodes.findByIdentifier.withArgs('chassisnode').resolves();
            return discoveryJob.setComputeEnclosureToPhysicalChassisRelations('node1').should.be.fulfilled
            .then(function() {
                expect(warnLoggerSpy).to.be.calledOnce;
            });
        });

        it('should handle case: error occurred while update node relations', function() {
            waterline.nodes.findByIdentifier.withArgs('node1').resolves({
                id: 'node1',
                relations: [
                    {
                        relationType: 'encloses',
                        targets: [
                            'node2'
                        ]
                    }
                ]
            });
            waterline.nodes.findByIdentifier.withArgs('node2').resolves({
                id: 'node2'
            });
            waterline.catalogs.findLatestCatalogOfSource.withArgs('node2', 'devicesummary').resolves({
                source: 'devicesummary',
                data: {
                    systemGeneration: 'Modular',
                    cmcip: 'chassisnode'
                }
            });
            waterline.nodes.findByIdentifier.withArgs('chassisnode').resolves({
                name: 'chassis',
                id: 'node3',
                relations: [
                ]
            });
            waterline.nodes.updateOne.rejects('fake error');
            return discoveryJob.setComputeEnclosureToPhysicalChassisRelations('node1').should.be.fulfilled
            .then(function() {
                expect(errorLoggerSpy).to.be.calledOnce;
            });
        });
    });

    describe('getIpv4Ranges', function() {
        it('should handle invalid end ip', function() {
            var entry = {
                deviceTypesToDiscover: 'CHASSIS',
                startIp: '255.255.255.254',
                endIp: '0.0.0.0',
                credentials: {
                    userName: 'test',
                    password: 'test'
                }
            };
            var range = discoveryJob.getIpv4Ranges(entry);
            return expect(range[0].deviceEndIp).to.be.equal('255.255.255.255');
        });
    });
});
