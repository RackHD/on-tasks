// Copyright 2016, EMC, Inc.

'use strict';

describe('General Redfish Catalog Job', function () {
    var uuid = require('node-uuid'),
        graphId = uuid.v4(),
        redfishJob,
        waterline = {},
        sandbox = sinon.sandbox.create(),
        chassisData = {
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
        };
        var setup = sandbox.stub().resolves();
        var clientRequest = sandbox.stub();
    
    before(function() { 
        function RedfishTool() {
            this.setup = setup;
            this.clientRequest = clientRequest;
            this.settings = {
                root: '/'
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
            create: sandbox.stub().resolves()
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
        }, {target:'abc'}, graphId);
        clientRequest.resetBehavior();
        clientRequest.reset();
        waterline.catalogs.create.reset();
    });
       
    describe('redfish fan / power endpoints', function() {
        it('should successfully catalog elements', function() {
            clientRequest.onCall(0).resolves(chassisData);
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
            redfishJob._run();
            return redfishJob._deferred.should.be.rejectedWith('some error');
        });

        it('should fail with no elements ', function() {
            clientRequest.onCall(0).rejects('Missing catalogEndpoints Resource');
            redfishJob._run();
            return redfishJob._deferred
                .should.be.rejectedWith('Missing catalogEndpoints Resource');
        });
    });

    describe('redfish disk endpoints', function() {
        it('should successfully catalog elements', function() {
            clientRequest.onCall(0).resolves(chassisData);
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
            redfishJob._run();
            return redfishJob._deferred.should.be.rejectedWith('some error');
        });

        it('should fail with no elements ', function() {
            clientRequest.onCall(0).rejects('Missing storage Resource');
            redfishJob._run();
            return redfishJob._deferred
                .should.be.rejectedWith('Missing storage Resource');
        });
    });
});
