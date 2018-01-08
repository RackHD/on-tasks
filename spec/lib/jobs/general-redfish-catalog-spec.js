//Copyright 2017, Dell EMC, Inc.
'use strict';

describe('General Redfish Catalog Job', function () {
    var uuid = require('node-uuid'),
        graphId = uuid.v4(),
        redfishJob,
        waterline = {},
        sandbox = sinon.sandbox.create(),
        systemData = {
            body: {
                Links: {
                    CooledBy: [
                        {
                            "@odata.id": "/redfish/v1/Chassis/System.Embedded.1/Sensors/Fans/0x17||Fan.Embedded.1A"
                        }
                    ],
                    PoweredBy: [
                        {
                            "@odata.id": "/redfish/v1/Chassis/System.Embedded.1/Power/PowerSupplies/PSU.Slot.2"
                        }
                    ]
                },
                SimpleStorage: {
                    "@odata.id": "/redfish/v1/Systems/System.Embedded.1/Storage/Controllers"

                }
            }
        },
        simpleStorageMembers = {
            body: {
                Members: [{'@odata.id':'/redfish/v1/Systems/System.Embedded.1/Storage/Controllers/AHCI.Embedded.1-1'}]
            }
        },
        powerData = {
            body: {
                "@odata.context": "/redfish/v1/$metadata#Power.Power",
                "@odata.id": "/redfish/v1/Chassis/System.Embedded.1/Power/PowerSupplies/PSU.Slot.2",
                "@odata.type": "#Power.v1_0_2.PowerSupply",
                "FirmwareVersion": "00.11.3F",
                "LastPowerOutputWatts": 495,
                "LineInputVoltage": 210,
                "LineInputVoltageType": "ACMidLine",
                "MemberID": "PSU.Slot.2",
                "Model": "PWR SPLY,495W,RDNT,EMSN       ",
                "Name": "PS2 Status",
                "PartNumber": "09338DA04",
                "PowerCapacityWatts": 495,
                "PowerSupplyType": "AC",
                "Redundancy": [
                    {
                        "@odata.id": "/redfish/v1/Chassis/System.Embedded.1/Power/Redundancy/iDRAC.Embedded.1%23SystemBoardPSRedundancy",
                        "MaxNumSupported": 4,
                        "MemberID": "iDRAC.Embedded.1#SystemBoardPSRedundancy",
                        "MinNumNeeded": 2,
                        "Mode": [
                            {
                                "Member": "N+1"
                            }
                        ],
                        "Name": "System Board PS Redundancy",
                        "RedundancySet": [],
                        "RedundancySet@odata.count": 0,
                        "Status": {
                            "Health": "Ok",
                            "State": "Disabled"
                        }
                    }
                ],
                "Redundancy@odata.count": 1,
                "RelatedItem": [
                    {
                        "@odata.id": "/redfish/v1/Chassis/System.Embedded.1"
                    }
                ],
                "RelatedItem@odata.count": 1,
                "SerialNumber": "PH162985B50068",
                "SparePartNumber": "09338DA04",
                "Status": {
                    "Health": "OK",
                    "State": "Enabled"
                }
            }
        },
        fanData = {
            body: {
                "@odata.context": "/redfish/v1/$metadata#Thermal.Thermal",
                "@odata.id": "/redfish/v1/Chassis/System.Embedded.1/Sensors/Fans/0x17||Fan.Embedded.1A",
                "@odata.type": "#Thermal.v1_0_2.Fan",
                "FanName": "System Board Fan5B",
                "LowerThresholdCritical": 600,
                "LowerThresholdFatal": 600,
                "LowerThresholdNonCritical": 840,
                "MaxReadingRange": 197,
                "MemberID": "0x17||Fan.Embedded.5B",
                "MinReadingRange": 139,
                "PhysicalContext": "SystemBoard",
                "Reading": 2280,
                "ReadingUnits": "RPM",
                "Redundancy": [],
                "Redundancy@odata.count": 0,
                "RelatedItem": [
                    {
                        "@odata.id": "/redfish/v1/Chassis/System.Embedded.1"
                    }
                ],
                "RelatedItem@odata.count": 1,
                "Status": {
                    "Health": "OK",
                    "State": "Enabled"
                },
                "UpperThresholdCritical": null,
                "UpperThresholdFatal": null,
                "UpperThresholdNonCritical": null
            }
        },
        drivesData = {
            body: {
                "@odata.context": "/redfish/v1/$metadata#SimpleStorage.SimpleStorage",
                "@odata.id": "/redfish/v1/Systems/System.Embedded.1/Storage/Controllers/AHCI.Embedded.1-1",
                "@odata.type": "#SimpleStorage.v1_0_2.SimpleStorage",
                "Description": "Simple Storage Controller",
                "Devices": [
                    {
                        "Manufacturer": "SEAGATE",
                        "Model": "ST91000640NS",
                        "Name": "Physical Disk 0:0",
                        "Status": {
                            "Health": null,
                            "HealthRollUp": null,
                            "State": "Enabled"
                        }
                    }
                ],
                "Devices@odata.count": 1,
                "Id": "AHCI.Embedded.1-1",
                "Name": "C610/X99 series chipset sSATA Controller [AHCI mode]",
                "Status": {
                    "Health": null,
                    "HealthRollUp": null,
                    "State": "Enabled"
                },
                "UEFIDevicePath": "PciRoot(0x0)/Pci(0x11,0x4)"
            }
        },
        coolingRoot = {
            body: {
                "Id": "RootService",
                "Name": "Root Service",
                "RedfishVersion": "1.0.2",
                "UUID": "92384634-2938-2342-8820-489239905423",
                "Systems": {
                },
                "Chassis": {
                },
                "DCIMPower": {
                },
                "DCIMCooling": {
                    "@odata.id": "/redfish/v1/DCIMCooling/default/CoolingTower"
                },
                "Managers": {
                },
                "Tasks": {
                },
                "SessionService": {
                },
                "AccountService": {
                },
                "EventService": {
                },
                "Links": {
                },
                "Oem": {},
                "@odata.context": "/redfish/v1/$metadata#ServiceRoot",
                "@odata.id": "/redfish/v1/",
                "@odata.type": "#ServiceRoot.v1_0_2.ServiceRoot"
            }
        },
        coolingList = {
            body: {
                "@odata.type": "#CoolingTowerollection.CoolingTowerCollection",
                "Name": "Lab 1 Cooling Tower Collection",
                "Members@odata.count": 1,
                "Members": [
                    {
                        "@odata.id": "/redfish/v1/DCIMCooling/default/CoolingTower/0"
                    }
                ],
                "@odata.context": "/redfish/v1/$metadata#DCIMCoolingCollection",
                "@odata.id": "/redfish/v1/DCIMCooling/default/CoolingTower",
                "@Redfish.Copyright": "Copyright 2014-2016 Distributed Management Task Force, Inc. (DMTF). For the full DMTF copyright policy, see http://www.dmtf.org/about/policies/copyright."            }
        },
        coolingData = {
            body: {
                "@odata.context": "/redfish/v1/$metadata#CoolingTower.CoolingTower",
                "@odata.id": "/redfish/v1/DCIMCooling/default/CoolingTower/0",
                "@odata.type": "#CoolingTower.v1_0_0.CoolingTower",
                "ID": "CoolingTower0",
                "Name": "CoolingTower0",
                "FirmwareRevision": "1.0.0",
                "DateOfManufacture": "01012017",
                "Manufacturer": "Manufacturer",
                "Model": "Model",
                "SerialNumber": "SerialNum",
                "PartNumber": "PartNum",
                "AssetTag": "AssetTag",
                "PhysicalLocation": "Location",
                "OperatingLevelSwitch": "A",
                "ColdWaterFlowSetPoint": 40,
                "FanVFDModulation": 50,
                "CoolingTowerEnabled": "True",
                "FanStarted": "True",
                "LeadLagPosition": "A",
                "VibrationSwitchSetpoint": 0,
                "FanHighSpeedSetting": 60,
                "FanLowSpeedSetting": 40,
                "CoolingTowerLeadLagPosition": "A",
                "CoolingTowerAvailable": "True",
                "RequestSignal": "A",
                "UnitPoweredOn": "True",
                "HighFanSpeedStatus": "True",
                "FanPoweredOn": "True",
                "LowFanSpeedStatus": "False",
                "AlarmResetPoweredOn": "True",
                "DrainValveProof": "A",
                "FanFaultAlarmOn": "False",
                "ColdWaterValveFailOpenAlarmOn": "False",
                "ColdWaterValveFailCloseAlarmOn": "False",
                "CoolingWaterValveFailOpenAlarmOn": "False",
                "CoolingWaterValveFailCloseAlarmOn": "False",
                "FanFailureToRunAlarmOn": "False",
                "FanHighSpeedAlarmOn": "False",
                "FanLowSpeedAlarmOn": "False",
                "LowFanGearOilLevelAlarmOn": "False",
                "SumpTankLowLevelAlarm": "False",
                "SumpTankHighLevelAlarmOn": "False",
                "VibrationSwitchAlarmOn": "False",
                "Oem": {},
                "Sensors": {}
            }
        },
    redfishNode =     {
        autoDiscover: false,
        catalogs: "/api/2.0/nodes/5a09dadfcd6a2a01006f4f87/catalogs",
        ibms: [],
        id: "5a09dadfcd6a2a01006f4f87",
        identifiers: [
            "System.Embedded.1",
            "http://172.23.0.1:8000/redfish/v1/Systems/System.Embedded.1",
            "NNRZST2-CN747517150043"
        ],
        name: "System",
        obms: [
            {
                "ref": "/api/2.0/obms/5a09dadfcd6a2a01006f4f88",
                "service": "redfish-obm-service"
            }
        ],
        pollers: "/api/2.0/nodes/5a09dadfcd6a2a01006f4f87/pollers",
        relations: [
            {
                info: null,
                relationType: "managedBy",
                targets: [
                    "5a09dadfcd6a2a01006f4f89"
                ]
            }
        ],
        tags: "/api/2.0/nodes/5a09dadfcd6a2a01006f4f87/tags",
        type: "redfish",
        workflows: "/api/2.0/nodes/5a09dadfcd6a2a01006f4f87/workflows"

        };
        var setup = sandbox.stub().resolves();
        var clientRequest = sandbox.stub();
    
    before(function() { 
        function RedfishTool() {
            this.setup = setup;
            this.clientRequest = clientRequest;
            this.settings = {
                root: '/redfish/v1/'
            };
        }
        
        helper.setupInjector([
            helper.require('/lib/jobs/base-job.js'),
            helper.require('/lib/jobs/general-redfish-catalog.js'),
            helper.require('/lib/utils/job-utils/redfish-tool.js'),
            helper.di.simpleWrapper(waterline,'Services.Waterline'),
            helper.di.simpleWrapper(RedfishTool,'JobUtils.RedfishTool')
        ]);
        waterline.catalogs = {
            create: sandbox.stub().resolves(),
            count: sandbox.stub().resolves(0),
            update: sandbox.stub().resolves({})
        };
        waterline.nodes = {
            getNodeById: sandbox.stub().resolves(redfishNode)
        };

    });
    
    afterEach(function() {
        sandbox.restore();
    });
    
    beforeEach(function() {
        var Job = helper.injector.get('Job.General.Redfish.Catalog');
        redfishJob = new Job({
            uri:'fake',
            username:'user',
            password:'pass'
        }, {}, graphId);
        clientRequest.resetBehavior();
        clientRequest.reset();
        waterline.catalogs.create.reset();
    });

    describe('redfish fan / power endpoints', function() {
        it('should successfully catalog elements', function() {
            clientRequest.onCall(0).resolves(systemData);
            clientRequest.onCall(1).resolves(powerData);
            clientRequest.onCall(2).resolves(fanData);

            return redfishJob.catalogEndpoints('xyz')
            .then(function(node) {
                expect(node).to.be.an('Array').with.length(2);
                expect(waterline.catalogs.create).to.be.calledTwice;
            });
        });
        it('should fail to catalog elements', function() {
            clientRequest.rejects('some error');
            return redfishJob.catalogEndpoints('xyz')
                .should.be.rejectedWith('some error');
        });

    });

    describe('redfish disk endpoints', function() {
        it('should successfully catalog elements', function() {
            clientRequest.onCall(0).resolves(systemData);
            clientRequest.onCall(1).resolves(simpleStorageMembers);
            clientRequest.onCall(2).resolves(drivesData);

            return redfishJob.driveEndpoints('xyz')
                .then(function(node) {
                    expect(node).to.be.an('Array').with.length(1);
                    expect(waterline.catalogs.create).to.be.calledOnce;
                });
        });
        it('should fail to catalog elements', function() {
            clientRequest.rejects('some error');
            return redfishJob.driveEndpoints('xyz')
                .should.be.rejectedWith('some error');
        });

        it('should fail with no elements ', function() {
            clientRequest.onCall(0).rejects('Missing storage Resource');
            return redfishJob.driveEndpoints('xyz')
                .should.be.rejectedWith('Missing storage Resource');
        });
    });

    describe('redfish all endpoints', function() {
        it('should successfully catalog all endpints', function() {
            clientRequest.onCall(0).resolves(coolingRoot);
            clientRequest.onCall(1).resolves(coolingList);
            clientRequest.onCall(2).resolves(coolingData);

            return redfishJob.getAllCatalogs(['1234'])
                .then(function(node) {
                    expect(node).to.be.an('Array').with.length(1);
                    expect(node[0]).to.equal('1234');
                    expect(waterline.catalogs.create).to.be.calledThrice;
                    expect(clientRequest).to.be.calledThrice;
                });
        });

        it('should fail to catalog elements', function() {
            clientRequest.rejects('some error');
            return redfishJob.getAllCatalogs(['1234'])
                .should.be.rejectedWith('some error');
        });
    });

    describe('redfish catalogSystem', function() {
        it('should successfully catalog System', function() {
            clientRequest.onCall(0).resolves(coolingRoot);
            clientRequest.onCall(1).resolves(coolingList);
            clientRequest.onCall(2).resolves(coolingData);

            return redfishJob.getSystemsCatalogs(['1234'])
                .then(function(node) {
                    expect(node).to.be.an('Array').with.length(1);
                    expect(node[0]).to.equal('1234');
                    expect(waterline.catalogs.create).to.be.calledThrice;
                    expect(clientRequest).to.be.calledThrice;
                });
        });

        it('should fail to catalog elements', function() {
            clientRequest.rejects('some error');
            return redfishJob.getAllCatalogs(['1234'])
                .should.be.rejectedWith('some error');
        });
    });
});
