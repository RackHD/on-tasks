// Copyright 2017, EMC, Inc.

'use strict';


describe('Ucs Catalog Job', function () {
    var sampleData = JSON.parse(require('../utils/job-utils/stdout-helper.js').ucsCatalogData);
    var uuid = require('node-uuid'),
        graphId = uuid.v4(),
        ucsJob,
        waterline = {},
        sandbox = sinon.sandbox.create();
        var setup = sandbox.stub().resolves();
        var clientRequest = sandbox.stub();
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
                        "uri": "http://10.240.19.226:6080/sys",
                        "host": "10.240.19.226",
                        "root": "/sys",
                        "port": "6080",
                        "protocol": "http",
                        "username": "ucspe",
                        "password": "ucspe",
                        "ucs": "10.240.19.236",
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
                        "uri": "http://10.240.19.226:6080/sys",
                        "host": "10.240.19.226",
                        "root": "/sys",
                        "port": "6080",
                        "protocol": "http",
                        "username": "ucspe",
                        "ucs": "10.240.19.236",
                        "verifySSL": false
                    }
                }
            ]
        };


    before(function() { 
        function UcsTool() {
            this.setup = setup;
            this.clientRequest = clientRequest;
            this.settings = {
                root: '/'
            };
        }
        
        helper.setupInjector([
            helper.require('/lib/jobs/base-job.js'),
            helper.require('/lib/jobs/ucs-catalog.js'),
            helper.require('/lib/utils/job-utils/ucs-tool.js'),
            helper.di.simpleWrapper(waterline,'Services.Waterline'),
            helper.di.simpleWrapper(UcsTool,'JobUtils.UcsTool')
        ]);
        waterline.catalogs = {
            create: sandbox.stub().resolves()
        };
        waterline.nodes = {
            getNodeById: sandbox.stub().resolves(node)
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
        }, {target:'abc'}, graphId);
        clientRequest.resetBehavior();
        clientRequest.reset();
        waterline.catalogs.create.reset();
    });
       
    describe('run catalog ucs servers', function() {
        it('should successfully catalog servers', function() {
            clientRequest.withArgs('/catalog?identifier=sys/rack-unit-2')
                        .resolves({ "body": sampleData.rackunit});
            clientRequest.withArgs('/catalog?identifier=sys/rack-unit-2/board')
                        .resolves({ "body": sampleData.board});
            clientRequest.withArgs('/catalog?identifier=sys/rack-unit-2/board/memarray-1')
                        .resolves({ "body": sampleData["memarray-1"]});
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
                boardChildren["disk-collection"] = disk;
                boardChildren["storage-flexflash-collection"] = [storageFlexflash];
                boardChildren["memarray-collection"] = [memarray];
                boardResult.children = boardChildren;
                expect(waterline.nodes.getNodeById).to.be.calledOnce;
                expect(waterline.nodes.getNodeById).to.be.calledWith('abc');
                expect(clientRequest).to.be.calledThrice;
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

        it('should get rejective on ucs servers', function() {
            waterline.nodes.getNodeById.rejects('Unkown error');
            expect(ucsJob._run()).to.be.rejected;
        });

        it('should get nodeId on ucs servers', function() {
            waterline.nodes.getNodeById.rejects('No Servers Members');
            ucsJob.catalogServers('123').then(function(nodeId) {
                expect(nodeId).to.equal('123');
            });
        });
    });
});
