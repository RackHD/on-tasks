// Copyright 2016, EMC, Inc.

'use strict';

describe('Redfish Discovery Job', function () {
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
        waterline = {},
        Error;
        
    var obm = {
        service: 'redfish-obm-service',
        config: { root: '/fake' }
    };

    var node = {
        id: 'abc',
        type: 'enclosure',
        name: 'Node',
        identifiers: [],
        relations: [
            { relationType: 'encloses', 
              targets: [ '/fake' ] },
            { relationType: 'enclosedBy', 
              targets: [ '/fake' ]}
        ]
    };
    
    before(function() { 
        helper.setupInjector([
            helper.require('/lib/jobs/base-job.js'),
            helper.require('/lib/jobs/redfish-discovery.js'),
            helper.require('/lib/utils/job-utils/redfish-tool.js'),
            helper.di.simpleWrapper(waterline,'Services.Waterline')
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
    
    afterEach(function() {
        sandbox.restore();
    });
    
    beforeEach(function() {
        var Job = helper.injector.get('Job.Redfish.Discovery');
        redfishJob = new Job({
            uri:'https://1.1.1.1/redfish/v1',
            username:'user',
            password:'pass'
        }, {}, graphId);
        
        sandbox.stub(redfishJob.redfish);
        redfishTool = redfishJob.redfish;
        
        rootData = {
            body: { 
                Chassis: { '@odata.id':'/redfish/v1/Chassis/abc123' }, 
                Systems: { '@odata.id':'/redfish/v1/Systems/abc123' } 
            }
        };
        listChassisData = { 
            body: {
                Members: [
                    {'@odata.id':'/redfish/v1/Chassis/abc123'}
                ]
            }
        };
        getChassisData = {
            body: {
                Links: {
                    ComputerSystems: [
                        {'@odata.id':'/redfish/v1/Systems/abc123'}
                    ]
                },
                Name: 'Chassis'
            }
        };
        listSystemData = { 
            body: {
                Members: [
                    {'@odata.id':'/redfish/v1/Systems/abc123'}
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
                        {'@odata.id':'/redfish/v1/Chassis/abc123'}
                    ]
                },
                EthernetInterfaces: {
                    '@odata.id':'/redfish/v1/Systems/abc123/EthernetInterfaces'
                },
                Name: 'System'
            }
        };
    });
    
    describe('redfish discovery', function() {
        it('should successfully run job', function() { 
            redfishTool.clientRequest.onCall(0).resolves(rootData);
            redfishTool.clientRequest.onCall(1).resolves(listChassisData);
            redfishTool.clientRequest.onCall(2).resolves(getChassisData);
            redfishTool.clientRequest.onCall(3).resolves(listSystemData);
            redfishTool.clientRequest.onCall(4).resolves(getSystemData);
            redfishTool.clientRequest.onCall(2).resolves(getSystemData);
            redfishTool.clientRequest.onCall(3).resolves(ethernetInterfaces);
            redfishJob._run();
            return redfishJob._deferred
            .then(function() {
                expect(waterline.nodes.updateOne).to.be.called.twice;
            });
        });
        
        it('should fail to run job', function() { 
            redfishTool.clientRequest.rejects('some error');
            redfishJob._run();
            return redfishJob._deferred.should.be.rejectedWith('some error');
        });
        
        it('should construct without credentials', function() { 
            var Job = helper.injector.get('Job.Redfish.Discovery');
            var testJob = new Job({
                uri:'fake'
            }, {}, graphId);
            expect(testJob.settings)
                .to.have.property('username').and.equal(undefined);
            expect(testJob.settings)
                .to.have.property('password').and.equal(undefined);
        });
    });

    describe('redfish chassis', function() {
        it('should create chassis node', function() { 
            redfishTool.clientRequest.onCall(0).resolves(listChassisData);
            redfishTool.clientRequest.onCall(1).resolves(getChassisData);
            return redfishJob.createChassis(rootData.body)
            .then(function() {
                expect(waterline.nodes.updateOne).to.be.called.once;
            });
        });
        
        it('should log no system members found warning', function() { 
            delete getChassisData.body.Links;
            redfishTool.clientRequest.onCall(0).resolves(listChassisData);
            redfishTool.clientRequest.onCall(1).resolves(getChassisData);
            return redfishJob.createChassis(rootData.body)
            .then(function() {
                expect(waterline.nodes.updateOne).to.be.called.once;
            });
        });  
             
        it('should fail to create chassis node', function() { 
            return expect(redfishJob.createChassis.bind(redfishJob,{}))
                .to.throw('No Chassis Members Found');
        });
    });
    
    describe('redfish system', function() {
        it('should create system node', function() {
            ethernetInterfaces.body.Members = [
                {'@odata.id':'/redfish/v1/Systems/abc123/EthernetInterfaces'}
            ];
            redfishTool.clientRequest.onCall(0).resolves(listSystemData);
            redfishTool.clientRequest.onCall(1).resolves(getSystemData);
            redfishTool.clientRequest.onCall(2).resolves(getSystemData);
            redfishTool.clientRequest.onCall(3).resolves(ethernetInterfaces);
            redfishTool.clientRequest.onCall(4).resolves({body: 
                {'MACAddress':'00:01:02:03:04:05'}
            });
            return redfishJob.createSystems(rootData.body)
            .then(function() {
                expect(waterline.nodes.updateOne).to.be.called.once;
            });
        });
        
        it('should log no chassis members found warning', function() { 
            delete getSystemData.body.Links;
            redfishTool.clientRequest.onCall(0).resolves(listSystemData);
            redfishTool.clientRequest.onCall(1).resolves(getSystemData);
            redfishTool.clientRequest.onCall(2).resolves(getSystemData);
            redfishTool.clientRequest.onCall(3).resolves(ethernetInterfaces);
            return redfishJob.createSystems(rootData.body)
            .then(function() {
                expect(waterline.nodes.updateOne).to.be.called.once;
            });
        });
        
        it('should skip create system node', function() { 
            return expect(redfishJob.createSystems({})).to.be.fullfilled;
        });
        
        it('should fail to create system node', function() { 
            redfishTool.clientRequest.onCall(0).rejects('some error');
            return expect(redfishJob.createSystems(rootData.body))
                .to.be.rejectedWith('some error');
                
        });
    });
    
    describe('redfish discovery upserts', function() {
        it('should create new node', function() { 
            var error = new Error.NotFoundError();
            waterline.nodes.needOne.rejects(error);
            return redfishJob.upsertRelations(node,[])
            .then(function() {
                expect(waterline.nodes.create).to.be.called.once;  
            });
        });
        
        it('should reject', function() { 
            waterline.nodes.needOne.rejects('some error');
            return expect(redfishJob.upsertRelations(node,[]))
                .to.be.rejectedWith('some error');
        });
        
    });
});
