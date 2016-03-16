// Copyright 2016, EMC, Inc.

'use strict';

describe('Emc Redfish Catalog Job', function () {
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
                        Elements: { 
                            '@odata.id':'/redfish/v1/Chassis/0/Elements' 
                        }     
                    }
                }
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
        elementData = {
            body: [{ data: 'data' }]
        };
    
    before(function() { 
        function redfishTool() {
            this.setup = sandbox.stub().resolves();
            this.clientRequest = sandbox.stub();
        }
        
        helper.setupInjector([
            helper.require('/lib/jobs/base-job.js'),
            helper.require('/lib/jobs/emc-redfish-catalog.js'),
            helper.require('/lib/utils/job-utils/redfish-tool.js'),
            helper.di.simpleWrapper(waterline,'Services.Waterline'),
            helper.di.simpleWrapper(redfishTool,'JobUtils.RedfishTool')
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
        redfishTool = redfishJob.redfish;
        redfishTool.settings = {root:'/'};
    });
    
    describe('run catalog elements', function() {
        it('should successfully run job', function() { 
            redfishTool.clientRequest.onCall(0).resolves(rootData);
            redfishTool.clientRequest.onCall(1).resolves(elementMembers);
            redfishTool.clientRequest.onCall(2).resolves(elementData);
            redfishTool.clientRequest.onCall(3).resolves(elementData);
            redfishJob._run();
            return redfishJob._deferred
            .then(function() {
                expect(waterline.catalogs.create).to.be.called.once
            });
        });
        
        it('should fail to catalog elements', function() { 
            redfishTool.clientRequest.rejects('some error');
            redfishJob._run();
            return redfishJob._deferred.should.be.rejectedWith('some error');
        });
        
        it('should fail with no elements ', function() { 
            redfishTool.clientRequest.onCall(0).resolves({body:{}});
            redfishJob._run();
            return redfishJob._deferred
                .should.be.rejectedWith('Missing Emc Element Data');
        });
    });
});
