//Copyright 2017, Dell EMC, Inc.

'use strict';
describe('Ucs Discovery Job', function () {
    var uuid = require('node-uuid'),
        sandbox = sinon.sandbox.create(),
        taskId = uuid.v4(),
        ucsJob,
        ucsTool,
        rootData,
        waterline = {},
        Error;

    var obm = {
        config: {
            uri: "http://10.123.45.678:7080/sys",
            host: "10.123.45.678",
            root: "/sys",
            port: "7080",
            protocol: "http",
            username: "user",
            password: "pass",
            ucs: "10.000.12.000",
            verifySSL: false
        },
        service: "ucs-obm-service"
    };

    var node = {
        id: 'abc',
        type: 'compute',
        name: 'ls-testServiceProfile',
        identifiers: [],
        relations: [
            {
                "relationType": "associatedTo",
                "info": null,
                "targets": [
                    "sys/chassis-4/blade-1"
                ]
            }
        ],
        obm: [obm]
    };
    
    before(function() { 
        helper.setupInjector([
            helper.require('/lib/jobs/base-job.js'),
            helper.require('/lib/jobs/ucs-service-profile-discovery.js'),
            helper.require('/lib/utils/job-utils/ucs-tool.js'),
            helper.di.simpleWrapper(waterline,'Services.Waterline')
        ]);
        waterline.nodes = {
            create: sandbox.stub().resolves(node),
            needOne: sandbox.stub().resolves(node),
            needOneById: sandbox.stub().resolves(node),
            updateOne: sandbox.stub().resolves(node)
        };
        waterline.obms = {
            upsertByNode: sandbox.stub().resolves(obm)
        };
        Error = helper.injector.get('Errors');
    });
    
    afterEach(function() {
        sandbox.restore();
    });
    
    beforeEach(function() {
        var Job = helper.injector.get('Job.Ucs.Service.Profile.Discovery');
        ucsJob = new Job({
            uri:'https://10.123.45.678:7080/sys',
            username:'user',
            password:'pass',
            ucs:"10.000.12.000"
        }, {}, taskId);
        
        sandbox.stub(ucsJob.ucs);
        ucsTool = ucsJob.ucs;

        rootData = {
            body: {
                ServiceProfile: {
                    members:[
                        {
                            "assoc_state": "associated",
                            "associatedServer": "sys/chassis-3/blade-3",
                            "name": "ls-TTTTTTTTTT",
                            "path": "org-root/ls-TTTTTTTTTT"
                        },
                        {
                            "assoc_state": "associated",
                            "associatedServer": "sys/rack-unit-3",
                            "name": "ls-Profile3",
                            "path": "org-root/ls-Profile3"
                        }
                    ],
                    org: "root"
                }
            }
        };
        waterline.nodes.updateOne.reset();
    });

    it('should create relations', function() {
        return ucsJob.updateRelations(node.id,node.relations)
            .then(function() {
                expect(waterline.nodes.needOneById).to.be.calledOnce;
                expect(waterline.nodes.updateOne).to.be.called.once;
            });
    });

    it('should create update relations', function() {
        var error = new Error.NotFoundError();
        waterline.nodes.needOne.rejects(error);
        return ucsJob.updateRelations(node.id,node.relations)
            .then(function() {
                expect(waterline.nodes.needOneById).to.be.calledTwice;
                expect(waterline.nodes.updateOne).to.be.calledOnce;
            });
    });

    it('should update existing node', function() {
        var data = {
            "assoc_state": "associated",
            "associatedServer": "test",
            "name": "ls-test",
            "path": "org-root/ls-test"
        };
        node = {
            "autoDiscover": false,
            "id": "1234",
            "identifiers": [
                "10.xxx.xx.xxx",
                "org-root/ls-abc"
            ],
            "name": "ls-abc",
            "relations": [
                {
                    "relationType": "associatedTo",
                    "info": null,
                    "targets": [
                        "sys/abc-3/123-3"
                    ]
                }
            ],
            "type": "compute"
        };
        waterline.nodes.needOne.resolves(node);
        return ucsJob.createUpdateNode(data,'compute')
            .then(function() {
                expect(waterline.nodes.needOne).to.be.calledOnce;
                expect(waterline.nodes.updateOne).to.be.calledOnce;
                expect(waterline.obms.upsertByNode).to.be.calledOnce;
            });
    });

    it('should create new node', function() {
        var data = {
            "assoc_state": "associated",
            "associatedServer": "test",
            "name": "ls-test",
            "path": "org-root/ls-test"
        };
        var error = new Error.NotFoundError();
        waterline.nodes.needOne.rejects(error);
        return ucsJob.createUpdateNode(data,'compute')
            .then(function() {
                expect(waterline.nodes.create).to.be.calledOnce;
                expect(waterline.obms.upsertByNode).to.be.calledTwice;
            });
    });

    it('should successfully run the job', function() {
        ucsTool.clientRequest.onCall(0).resolves(rootData);
        ucsTool.clientRequest.onCall(1).resolves(rootData);
        return ucsJob._run()
            .then(function() {
                 expect(waterline.nodes.updateOne).to.be.calledTwice;
            });
    });

    it('should fail to run job', function() {
        ucsTool.clientRequest.rejects('some error');
        ucsJob._run();
        return ucsJob._deferred.should.be.rejectedWith('some error');
    });

    it('should not update a node', function() {
        ucsTool.clientRequest.onCall(0).resolves([]);
        return ucsJob._run()
            .then(function() {
                expect(waterline.nodes.updateOne).to.not.be.calledTwice;
            });
    });

});
