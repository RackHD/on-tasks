// Copyright 2016, EMC, Inc.

'use strict';

describe('Emc Redfish Catalog Job', function () {
    var uuid = require('node-uuid'),
        graphId = uuid.v4(),
        redfishJob,
        waterline = {},
        sandbox = sinon.sandbox.create(),
        rootData = {
            body: { 
                Oem: { 
                    Emc: {
                        Elements: {'@odata.id':'/redfish/v1/Chassis/0/Elements'},
                        Hbas: {'@odata.id':'/redfish/v1/Chassis/0/Hbas'},
                        Aggregators: {'@odata.id':'/redfish/v1/Chassis/0/Aggregators'},
                        SpineModules: {'@odata.id':'/redfish/v1/Chassis/0/SpineModules'}
                    }
                }
            }
        },
        elementMembers = {
            body: {
                Members: [
                    { '@odata.id':'/redfish/v1/Chassis/0/Elements/0'}
                ]
            }
        },
        hbaMembers = {
            body: {
                Members: [{'@odata.id':'/redfish/v1/Chassis/0/Hbas/Controllers'}]
            }
        },
        aggregatorMembers = {
            body: {
                Members: [{'@odata.id':'/redfish/v1/Chassis/0/Aggregators/Controllers'}]
            }
        },
        spineModulesMembers = {
            body: {
                Members: [{'@odata.id':'/redfish/v1/Chassis/0/SpineModules/Controllers'}]
            }
        },
        elementData = {
            body: {
                Dimms: {'@odata.id':'/redfish/v1/Chassis/0/Elements/Dimms' },
                Controllers: {'@odata.id':'/redfish/v1/Chassis/0/Elements/Controllers'},
                Switches: {'@odata.id':'/redfish/v1/Chassis/0/Elements/Switches'},
                Drives:	[{
                    "@odata.id":	"/redfish/v1/Chassis/0/Elements/3/Drives/0"
                }]
            }
        },
        spineData = {
            body: {
                Vpd: {'@odata.id':'/redfish/v1/Chassis/0/Elements/Vpd'}
            }
        },
        subElementData = {
            body: {
                "@odata.context": "/redfish/v1/$metadata#EmcDimmCollection.EmcDimmCollection",
                "@odata.type": "#EmcDimmCollection.EmcDimmCollection",
                "@odata.id": "/redfish/v1/Chassis/0/Elements/0/Dimms",
                "Id": "DimmCollection",
                "Name": "Mock HCI System DIMM Collection",
                "Members@odata.count": 4,
                "Members": [
                    {
                        "@odata.id": "/redfish/v1/Chassis/0/Elements/0/Dimms/0"
                    },
                ]
            }
        },
        subElementDataDrivesArray = {
            body: {
                "@odata.context": "/redfish/v1/$metadata#EmcDimm.EmcDimm"
            }
        },
        subElementData2 = {
            body: {
                "@odata.context": "/redfish/v1/$metadata#EmcDimm.EmcDimm",
                "@odata.type": "#EmcDimm.1.0.0.EmcDimm",
                "@odata.id": "/redfish/v1/Chassis/0/Elements/0/Dimms/0",
                "Id": "0",
                "Name": "Mock HCI System DIMM Info",
                "DimmType": "Ddr4",
                "Manufacturer": "Micron",
                "SizeGB": 8,
                "SpeedMhz": 2133,
                "PartNumber": "MI-DDR4-08-2133",
                "SerialNumber": "MI00000000",
                "EmcPartNumber": "999-999-300A-00",
                "EmcSerialNumber": "EMCDDR000000"
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
            helper.require('/lib/jobs/emc-redfish-catalog.js'),
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
        var Job = helper.injector.get('Job.Emc.Redfish.Catalog');
        redfishJob = new Job({
            uri:'fake',
            username:'user',
            password:'pass'
        }, {target:'abc'}, graphId);
        clientRequest.resetBehavior();
        clientRequest.reset();
        waterline.catalogs.create.reset();
    });
       
    describe('run catalog elements', function() {   
        it('should successfully catalog elements', function() {
            clientRequest.onCall(0).resolves(rootData);
            clientRequest.onCall(1).resolves(elementMembers);
            clientRequest.onCall(2).resolves(elementData);
            clientRequest.onCall(3).resolves(elementData);
            clientRequest.onCall(4).resolves(subElementData);
            clientRequest.onCall(5).resolves(subElementData2);
            clientRequest.onCall(6).resolves(subElementDataDrivesArray);
            return redfishJob.catalogElements('xyz')
            .then(function(node) {
                expect(node).to.equal('xyz');
                expect(waterline.catalogs.create).to.be.calledOnce;
            });
        });
        
        it('should successfully catalog hbas', function() {
            clientRequest.onCall(0).resolves(rootData);
            clientRequest.onCall(1).resolves(hbaMembers);
            clientRequest.onCall(2).resolves(elementData);
            clientRequest.onCall(3).resolves(hbaMembers);
            clientRequest.onCall(4).resolves(elementData);
            return redfishJob.catalogHbas('xyz')
            .then(function(node) {
                expect(node).to.equal('xyz');
                expect(waterline.catalogs.create).to.be.calledOnce;
            });
        });
        
        it('should successfully catalog aggregators', function() {
            clientRequest.onCall(0).resolves(rootData);
            clientRequest.onCall(1).resolves(aggregatorMembers);
            clientRequest.onCall(2).resolves(elementData);
            clientRequest.onCall(3).resolves(elementData);
            clientRequest.onCall(4).resolves(elementData);
            return redfishJob.catalogAggregators('xyz')
            .then(function(node) {
                expect(node).to.equal('xyz');
                expect(waterline.catalogs.create).to.be.calledOnce;
            });
        });
       
        it('should successfully catalog spine modules', function() {
            clientRequest.onCall(0).resolves(rootData);
            clientRequest.onCall(1).resolves(spineModulesMembers);
            clientRequest.onCall(2).resolves(elementData);
            clientRequest.onCall(3).resolves(elementData);
            clientRequest.onCall(4).resolves(elementData);
            clientRequest.onCall(5).resolves(spineData);
            return redfishJob.catalogSpine('xyz')
            .then(function(node) {
                expect(node).to.equal('xyz');
                expect(waterline.catalogs.create).to.be.calledOnce;
            });
        });
        
        it('should fail to catalog elements', function() { 
            clientRequest.rejects('some error');
            redfishJob._run();
            return redfishJob._deferred.should.be.rejectedWith('some error');
        });
        
        it('should fail with no elements ', function() { 
            clientRequest.onCall(0).resolves({body:{}});
            redfishJob._run();
            return redfishJob._deferred
                .should.be.rejectedWith('Missing Emc Element Data');
        });
    });
});
