// Copyright 2016, EMC, Inc.

'use strict';

describe('Redfish Discovery Job', function () {
    var uuid = require('node-uuid'),
        graphId = uuid.v4(),
        redfishJob,
        redfishApi,
        listChassisData,
        getChassisData,
        listSystemData,
        getSystemData,
        waterline = {},
        redfishTool = {},
        sandbox = sinon.sandbox.create();
        
    before(function() { 
        helper.setupInjector([
            helper.require('/lib/jobs/base-job.js'),
            helper.require('/lib/jobs/redfish-discovery.js'),
            helper.di.simpleWrapper(redfishTool,'JobUtils.RedfishTool'),
            helper.di.simpleWrapper(waterline,'Services.Waterline')
        ]);
        waterline.nodes = {
            findOrCreate: sandbox.stub().resolves()
        };
            
        var redfish = require('redfish-node'); 
        redfishApi = Promise.promisifyAll(new redfish.RedfishvApi());
    });
    
    afterEach(function() {
        sandbox.restore();
    });
    
    beforeEach(function() {
        var Job = helper.injector.get('Job.Redfish.Discovery');
        redfishJob = new Job({
            uri:'fake',
            username:'user',
            password:'pass'
        }, {}, graphId);
        
        redfishJob.redfishApi = redfishApi;
        sandbox.stub(redfishJob.redfishApi);
        redfishTool.clientInit = sinon.stub().resolves(redfishApi);
        redfishTool.clientDone = sinon.stub().resolves();
        
        listChassisData = [
            null,
            { 
                body: {
                    Members: [
                        {'@odata.id':'/redfish/v1/Chassis/abc123'}
                    ]
                }
            }
        ];
        getChassisData = [
            null,
            {
                body: {
                    Links: {
                        ComputerSystems: [
                            {'@odata.id':'/redfish/v1/Systems/abc123'}
                        ]
                    },
                    Name: 'Chassis'
                }
            } 
        ];
        
        listSystemData = [
            null,
            { 
                body: {
                    Members: [
                        {'@odata.id':'/redfish/v1/Systems/abc123'}
                    ]
                }
            }
        ];
        getSystemData = [
            null,
            {
                body: {
                    Links: {
                        Chassis: [
                            {'@odata.id':'/redfish/v1/Chassis/abc123'}
                        ]
                    },
                    Name: 'System'
                }
            } 
        ];
    });
    
    describe('redfish discovery', function() {
        it('should successfully run job', function() { 
            redfishApi.listChassisAsync.resolves(listChassisData);
            redfishApi.getChassisAsync.resolves(getChassisData);
            redfishApi.listSystemsAsync.resolves(listSystemData);
            redfishApi.getSystemAsync.resolves(getSystemData);
            redfishJob._run();
            return redfishJob._deferred
            .then(function() {
                expect(waterline.nodes.findOrCreate).to.be.called.twice;
            });
        });
        
        it('should fail to run job', function() { 
            var err = new Error('some error');
            redfishApi.listChassisAsync.rejects(err);
            redfishJob._run();
            return redfishJob._deferred.should.be.rejectedWith(err);
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
            redfishApi.listChassisAsync.resolves(listChassisData);
            redfishApi.getChassisAsync.resolves(getChassisData);
            return redfishJob.createChassis(redfishApi)
            .then(function() {
                expect(waterline.nodes.findOrCreate).to.be.called.once;
            });
        });
        
        it('should fail to create chassis node', function() { 
            delete getChassisData[1].body.Links.ComputerSystems;
            redfishApi.listChassisAsync.resolves(listChassisData);
            redfishApi.getChassisAsync.resolves(getChassisData);
            return expect(redfishJob.createChassis(redfishApi)).to.be.rejected;
        });
    });
    
    describe('redfish system', function() {
        it('should create system node', function() { 
            redfishApi.listSystemsAsync.resolves(listSystemData);
            redfishApi.getSystemAsync.resolves(getSystemData);
            return redfishJob.createSystems(redfishApi)
            .then(function() {
                expect(waterline.nodes.findOrCreate).to.be.called.once;
            });
        });
        
        it('should fail to create system node', function() { 
            delete getSystemData[1].body.Links.Chassis;
            redfishApi.listSystemsAsync.resolves(listSystemData);
            redfishApi.getSystemAsync.resolves(getSystemData);
            return expect(redfishJob.createSystems(redfishApi)).to.be.rejected;
        });
        
    });
    
});
