// Copyright 2017, EMC, Inc.

'use strict';


describe('Ucs Catalog Job', function () {
    var sampleData = JSON.parse(require('../utils/job-utils/stdout-helper.js').ucsCatalogData);
    var uuid = require('node-uuid'),
        graphId = uuid.v4(),
        ucsJob,
        waterline = {},
        sandbox = sinon.sandbox.create();
        var nodeChassis = {
            "autoDiscover": false,
            "catalogs": "/api/2.0/nodes/5a09300a2ae51d82238fcb73/catalogs",
            "id": "5a09300a2ae51d82238fcb73",
            "identifiers": [
                "1*.1*.1*.1*:sys/chassis-3"
            ],
            "name": "sys/chassis-3",
            "obms": [
                {
                    "service": "ucs-obm-service",
                    "ref": "/api/2.0/obms/5a09300a2ae51d82238fcb74"
                }
            ],
            "tags": "/api/2.0/nodes/5a09300a2ae51d82238fcb73/tags",
            "pollers": "/api/2.0/nodes/5a09300a2ae51d82238fcb73/pollers",
            "relations": [],
            "type": "enclosure",
            "workflows": "/api/2.0/nodes/5a09300a2ae51d82238fcb73/workflows",
            "ibms": [],
            "obmSettings": [
                {
                    "service": "ucs-obm-service",
                    "config": {
                        "uri": "https://1*.1*.1*.1*:7080",
                        "host": "1*.1*.1*.1*",
                        "root": "",
                        "port": "7080",
                        "protocol": "https",
                        "ucsUser": "ucspe",
                        "ucsHost": "1*.1*.1*.1*",
                        "verifySSL": false,
                        "dn": "sys/chassis-3"
                    }

                }

            ]
        };
        var node = {
            "autoDiscover": false,
            "createdAt": "2017-01-26T19:25:50.337Z",
            "identifiers": [
                "00:00:FF:36:57:01",
                "00:00:FF:36:57:02"
            ],
            "name": "sys/rack-unit-2",
            "obm": [
                {
                    "config": {
                        "uri": "http://1*.1*.1*.1*:6080/sys",
                        "host": "1*.1*.1*.1*",
                        "root": "/sys",
                        "port": "6080",
                        "protocol": "http",
                        "username": "ucspe",
                        "password": "ucspe",
                        "ucs": "1*.1*.1*.1*",
                        "verifySSL": false
                    },
                    "service": "ucs-obm-service"
                }
            ],
            "relations": [],
            "tags": [],
            "type": "compute",
            "updatedAt": "2017-01-27T13:51:02.323Z",
            "id": "588a4d3ea510c0233a10214c",
            "obmSettings": [
                {
                    "service": "ucs-obm-service",
                    "config": {
                        "uri": "http://1*.1*.1*.1*:6080/sys",
                        "host": "1*.1*.1*.1*",
                        "root": "/sys",
                        "port": "6080",
                        "protocol": "http",
                        "username": "ucspe",
                        "ucs": "1*.1*.1*.1*",
                        "verifySSL": false
                    }
                }
            ]
        };


    before(function() { 
        helper.setupInjector([
            helper.require('/lib/jobs/base-job.js'),
            helper.require('/lib/jobs/ucs-base-job.js'),
            helper.require('/lib/jobs/ucs-catalog.js'),
            helper.require('/lib/utils/job-utils/ucs-tool.js'),
            helper.di.simpleWrapper(waterline,'Services.Waterline'),
        ]);
        waterline.catalogs = {
            create: sandbox.stub().resolves()
        };
        waterline.obms = {
            findByNode: sandbox.stub().resolves(node.obmSettings[0])
        };
    });
    
    afterEach(function() {
        sandbox.restore();
    });
    
    beforeEach(function() {
        var Job = helper.injector.get('Job.Ucs.Catalog');
        ucsJob = new Job({
            uri:'fake',
            username:'user',
            password:'pass'
        }, {physicalNodeList : ['abc']}, graphId);
        sandbox.stub(ucsJob, "_done");
        ucsJob._ucsRequestAsync = sandbox.stub().resolves();
        waterline.catalogs.create.reset();
        waterline.nodes = {
            getNodeById: sandbox.stub().resolves(node)
        };

    });
       
    describe('run catalog ucs servers', function() {
        it('should successfully catalog servers', function() {
            ucsJob._ucsRequestAsync.onCall(0)
                .resolves({ "body": sampleData.rackunit});
            ucsJob._ucsRequestAsync.onCall(1)
                .resolves({ "body": sampleData.board});
            ucsJob._ucsRequestAsync.onCall(2)
                .resolves({ "body": sampleData["memarray-1"]});
            ucsJob._ucsRequestAsync.onCall(3)
                .resolves({ "body": sampleData["storage-flexflash-1"]});
            return ucsJob._run()
            .then(function() {
                var ucsResult = _.cloneDeep(sampleData.rackunit[3]);
                var boardResult = _.cloneDeep(sampleData.rackunit[2]);
                var psuResult = [_.cloneDeep(sampleData.rackunit[0]),
                    _.cloneDeep(sampleData.rackunit[1])];
                var disk = [_.cloneDeep(sampleData.board[0]),_.cloneDeep(sampleData.board[1])];
                var storageFlexflash = _.cloneDeep(sampleData.board[3]);
                var memarray = _.cloneDeep(sampleData.board[2]);
                var memarrayChildren = _.cloneDeep(sampleData["memarray-1"]);
                memarrayChildren.pop();
                memarray.children = {"mem-collection": memarrayChildren};
                var boardChildren = {};
                storageFlexflash.children = {"disk-collection": sampleData["storage-flexflash-1"]};
                boardChildren["disk-collection"] = disk;
                boardChildren["storage-flexflash-collection"] = [storageFlexflash];
                boardChildren["memarray-collection"] = [memarray];
                boardResult.children = boardChildren;
                expect(waterline.nodes.getNodeById).to.be.calledOnce;
                expect(waterline.nodes.getNodeById).to.be.calledWith('abc');
                expect(ucsJob._ucsRequestAsync.callCount).to.equal(4);
                expect(waterline.catalogs.create.getCall(0).args[0].node).to.equal('abc');
                expect(waterline.catalogs.create.getCall(0).args[0].source)
                    .to.equal('UCS:psu-collection');
                expect(waterline.catalogs.create.getCall(0).args[0].data)
                    .to.deep.equal(psuResult);
                expect(waterline.catalogs.create.getCall(1).args[0].node).to.equal('abc');
                expect(waterline.catalogs.create.getCall(1).args[0].source).to.equal('UCS:board');
                expect(waterline.catalogs.create.getCall(1).args[0].data)
                    .to.deep.equal(boardResult);
                expect(waterline.catalogs.create.getCall(2).args[0].node).to.equal('abc');
                expect(waterline.catalogs.create.getCall(2).args[0].source).to.equal('UCS');
                expect(waterline.catalogs.create.getCall(2).args[0].data).to.deep.equal(ucsResult);
            });
        });

       it('should successfully catalog chassis', function() {
            waterline.nodes.getNodeById = sandbox.stub().resolves(nodeChassis);
            ucsJob._ucsRequestAsync.onCall(0)
                .resolves({ "body": sampleData["chassis-3"]});
            return ucsJob._run()
            .then(function() {
                expect(waterline.nodes.getNodeById).to.be.calledOnce;
                expect(waterline.nodes.getNodeById).to.be.calledWith('abc');
                expect(ucsJob._ucsRequestAsync.callCount).to.equal(1);
                expect(waterline.catalogs.create.getCall(0).args[0].source)
                      .to.equal('UCS');
            });
        });

        it('should get rejective on ucs servers', function() {
            waterline.nodes.getNodeById.rejects('Unkown error');
            return ucsJob._run()
            .then(function(){
                expect(ucsJob._done).to.be.calledOnce;
                expect(ucsJob._done.getCall(0).args[0].message).to.equal('Unkown error');
            });
        });

        it('should get nodeId on ucs servers', function() {
            waterline.nodes.getNodeById.rejects('No Servers Members');
            ucsJob.catalogServers('123').then(function(nodeId) {
                expect(nodeId).to.equal('123');
            });
        });

        it('should log error if no obm server is found.', function() {
            waterline.obms.findByNode.resolves();
            return ucsJob._getObmsByNodeId('123')
                .then(function() {
                    throw new Error('test should fail.');
                }, function(error) {
                    expect(error.message).to.equal('No ucs-obm-service found for id: 123');
                });
        });
    });
});
