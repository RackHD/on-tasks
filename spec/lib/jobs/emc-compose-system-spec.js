// Copyright 2016, EMC, Inc.

'use strict';

describe('Emc Redfish Compose System Job', function () {
    var uuid = require('node-uuid'),
        graphId = uuid.v4(),
        redfishJob,
        redfishTool,
        waterline = {},
        sandbox = sinon.sandbox.create(),
        rootData = {
            body: { 
                Oem: { 
                    Emc: {
                        FabricService: { 
                            '@odata.id':'/redfish/v1/Chassis/0/FabricService' 
                        }     
                    }
                },
                Systems: { '@odata.id':'/redfish/v1/Systems' }
            }
        },
        elementMembers = {
            body: {
                Members: [
                    { '@odata.id':'/redfish/v1/Chassis/0/Elements/0'},
                    { '@odata.id':'/redfish/v1/Chassis/0/Elements/' }
                ]
            }
        },
        catalogData = {
            data: [
                { 
                    Allocated: { systemId: 'NewSystem', value: true },
                    Id: '1', 
                    Type: 'ComputeElement'
                },
                { 
                    Allocated: { systemId: null, value: false },
                    Id: '2', 
                    Type: 'StorageElement'
                }
            ]
        };
    
    before(function() { 
        function redfishTool() {
            this.setup = sandbox.stub().resolves();
            this.clientRequest = sandbox.stub();
        }
        helper.setupInjector([
            helper.require('/lib/jobs/base-job.js'),
            helper.require('/lib/jobs/emc-compose-system.js'),
            helper.require('/lib/utils/job-utils/redfish-tool.js'),
            helper.di.simpleWrapper(waterline,'Services.Waterline'),
            helper.di.simpleWrapper(redfishTool,'JobUtils.RedfishTool')
        ]);
        waterline.catalogs = {
            updateOne: sandbox.stub().resolves(),
            findMostRecent: sandbox.stub().resolves(catalogData)
        };
    });
    
    afterEach(function() {
        sandbox.restore();
    });
    
    describe('run compose system job', function() {
        beforeEach(function() {
            var Job = helper.injector.get('Job.Emc.Compose.System');
            redfishJob = new Job({
                action: 'compose',
                endpoints: ['ComputeElement1'],
                name: 'NewSystem'
            }, {target:'abc'}, graphId);
            redfishTool = redfishJob.redfish;
            redfishTool.settings = {root:'/', uri:'http://fake/uri'};
        });

        it('should successfully compose system', function() { 
            redfishTool.clientRequest.onCall(0).resolves(rootData);
            redfishTool.clientRequest.onCall(1).resolves();
            redfishJob._run();
            return redfishJob._deferred
            .then(function() {
                expect(waterline.catalogs.findMostRecent).to.be.called.twice;
                expect(waterline.catalogs.updateOne).to.be.called.once;
            });
        });
        
        it('should successfully recompose system', function() { 
            redfishJob.endpoints.push('StorageElement1');
            redfishJob.action = 'recompose';
            redfishTool.clientRequest.onCall(0).resolves(rootData);
            redfishTool.clientRequest.onCall(1).resolves();
            redfishJob._run();
            return redfishJob._deferred
            .then(function() {
                expect(waterline.catalogs.findMostRecent).to.be.called.twice;
                expect(waterline.catalogs.updateOne).to.be.called.once;
            });
        });
        
        it('should successfully destroy system', function() { 
            redfishTool.clientRequest.onCall(0).resolves(rootData);
            redfishTool.clientRequest.onCall(1).resolves();
            redfishJob.action = 'destroy';
            redfishJob._run();
            return redfishJob._deferred
            .then(function() {
                expect(waterline.catalogs.findMostRecent).to.be.called.twice;
                expect(waterline.catalogs.updateOne).to.be.called.once;
            });
        });
        
        it('should fail to run job with invalid action', function() { 
            redfishJob.action = 'invalid';
            return expect(redfishJob._run.bind(redfishJob))
                .to.throw('Unknown Action Type: invalid');
        });
    });
});
