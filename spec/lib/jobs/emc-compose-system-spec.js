// Copyright 2016, EMC, Inc.

'use strict';

describe('Emc Redfish Compose System Job', function () {
    var uuid = require('node-uuid'),
        graphId = uuid.v4(),
        redfishJob,
        redfishTool,
        redfishDisc,
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
        systemsData = {
            body: {
                Systems: { '@odata.id':'/redfish/v1/Systems'  },
                Members: [
                    {'@odata.id':'/redfish/v1/Systems/1'}
                ],
                Oem: { Emc: { EndPoints: [ 'Element0' ] } },
                Id: 'SystemId'
            }
        },
        nodes = [{
            id: 'abc123',
            relations: [{
                relationType: 'elementEndpoints'
            }]
        }];
    
    before(function() { 
        /* jshint ignore:start */
        function redfishTool() {
            this.setup = sandbox.stub().resolves();
            this.clientRequest = sandbox.stub(); 
        }
        function redfishDisc() {
            this.getRoot = sandbox.stub().resolves();
            this.createSystems = sandbox.stub().resolves(nodes);
            this.createChassis = sandbox.stub().resolves(nodes);
            this.upsertRelations = sandbox.stub().resolves();
            this.mapPathToIdRelation = sandbox.stub().resolves();
        };
        /* jshint ignore:end */
        helper.setupInjector([
            helper.require('/lib/jobs/base-job.js'),
            helper.require('/lib/jobs/emc-compose-system.js'),
            helper.require('/lib/jobs/redfish-discovery.js'),
            helper.require('/lib/utils/job-utils/redfish-tool.js'),
            helper.di.simpleWrapper(waterline,'Services.Waterline'),
            helper.di.simpleWrapper(redfishTool,'JobUtils.RedfishTool'),
            helper.di.simpleWrapper(redfishDisc,'Job.Redfish.Discovery')
        ]);
        waterline.catalogs = {
            updateOne: sandbox.stub().resolves()
        };
        waterline.nodes = {
            findOne: sandbox.stub().resolves(nodes[0]),
            findByIdentifier: sandbox.stub().resolves(nodes[0]),
            destroyByIdentifier: sandbox.stub().resolves()
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
            redfishTool.clientRequest.reset();
        });

        it('should successfully compose system', function() { 
            redfishTool.clientRequest.onCall(0).resolves(rootData);
            redfishTool.clientRequest.onCall(1).resolves(systemsData);
            redfishTool.clientRequest.onCall(2).resolves(systemsData);
            redfishTool.clientRequest.onCall(3).resolves(rootData);
            redfishTool.clientRequest.onCall(4).resolves(systemsData);
            redfishTool.clientRequest.onCall(5).resolves(systemsData);
            redfishTool.clientRequest.onCall(6).resolves(rootData);
            redfishTool.clientRequest.onCall(7).resolves();
            redfishJob._run();
            return redfishJob._deferred
            .then(function() {
                expect(redfishTool.clientRequest.callCount).to.equal(8);
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
                expect(redfishTool.clientRequest.callCount).to.equal(2);
            });
        });
        
        it('should successfully destroy system', function() { 
            redfishTool.clientRequest.onCall(0).resolves(rootData);
            redfishTool.clientRequest.onCall(1).resolves();
            redfishJob.action = 'destroy';
            redfishJob._run();
            return redfishJob._deferred
            .then(function() {
                expect(redfishTool.clientRequest.callCount).to.equal(2);
            });
        });
        
        it('should fail with duplicated systemId', function() { 
            redfishTool.clientRequest.onCall(0).resolves(rootData);
            redfishTool.clientRequest.onCall(1).resolves(systemsData);
            redfishTool.clientRequest.onCall(2).resolves(systemsData);
            redfishJob.action = 'compose';
            redfishJob.name = 'SystemId';
            redfishJob._run();
            return expect(redfishJob._deferred).to.be.rejected;
        });
        
        it('should fail to run job with invalid action', function() { 
            redfishJob.action = 'invalid';
            redfishJob._run();
            return expect(redfishJob._deferred)
                .to.be.rejectedWith('Unknown Action Type: invalid');
        });
    });
});
