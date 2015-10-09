// Copyright 2015, EMC, Inc.
/* jshint node:true */

'use strict';

describe(require('path').basename(__filename), function () {
    var GenerateEnclJob;
    var uuid = require('node-uuid');
    var nodeId = uuid.v4();
    var mockWaterline;
    var job;
    mockWaterline = {
        nodes: {
            find: function(){},
            create: function(){},
            updateByIdentifier: function(){}
        },
        catalogs: {
            findMostRecent: function(){}
        }
    };

    before(function() {
        helper.setupInjector([
            helper.require('/lib/jobs/base-job'),
            helper.require('/lib/jobs/generate-enclosure'),
            helper.require('/lib/utils/job-utils/catalog-searcher.js'),
            helper.di.simpleWrapper(mockWaterline, 'Services.Waterline')
        ]);

        GenerateEnclJob = helper.injector.get('Job.Catalog.GenerateEnclosure');
    });

    describe('Node data validation', function() {

        beforeEach('Generate enclosure job node data validation', function() {
            job = new GenerateEnclJob({}, { target: nodeId }, uuid.v4());

            this.sandbox = sinon.sandbox.create();
            this.sandbox.stub(job, '_subscribeActiveTaskExists').resolves();
            this.sandbox.stub(mockWaterline.nodes,'updateByIdentifier');
            this.sandbox.stub(mockWaterline.nodes,'find').resolves();
        });

        afterEach('Generate enclosure job node data validation', function() {
            this.sandbox.restore();
        });

        it('should fail if ipmi-fru catalog does not exist', function(done) {
            this.sandbox.stub(mockWaterline.catalogs,'findMostRecent').rejects('empty catalog');

            job.run()
            .then(function() {
                done(new Error("Expected job to fail"));
            })
            .catch(function(e) {
                try {
                    expect(e).to.have.property('name').that.equals('Error');
                    expect(e).to.have.property('message').that.equals('empty catalog');
                    expect(mockWaterline.nodes.updateByIdentifier).to.not.have.been.called;
                    done();
                } catch (e) {
                    done(e);
                }
            });
        });

        it('Should fail if no buildin FRU entry in catalog', function(done) {
            var catalog = {
                    "data": {
                        "Basbrd Mgmt Ctlr": {
                            "Product Serial": "ABC123",
                            "Product Version": "FFF"
                        }
                    },
                    "id": uuid.v4(),
                    "node": nodeId,
                    "source": "ipmi-fru",
                };

            this.sandbox.stub(mockWaterline.catalogs,'findMostRecent').resolves(catalog);

            job.run()
            .then(function() {
                done(new Error("Expected job to fail"));
            })
            .catch(function(e) {
                try {
                    expect(e).to.have.property('name').that.equals('Error');
                    expect(e).to.have.property('message').that.equals(
                        'Could not find serial number in path: ' +
                        'Builtin FRU Device (ID 0).Product Serial');
                    expect(mockWaterline.nodes.updateByIdentifier).to.not.have.been.called;
                    done();
                } catch (e) {
                    done(e);
                }
            });
        });

        it('Should fail if no serial number item', function(done) {
            var catalog = {
                    "data": {
                        "Builtin FRU Device (ID 0)": {
                            "Product Version": "FFF"
                        }
                    },
                    "id": uuid.v4(),
                    "node": nodeId,
                    "source": "ipmi-fru",
                };

            this.sandbox.stub(mockWaterline.catalogs,'findMostRecent').resolves(catalog);

            job.run()
            .then(function() {
                done(new Error("Expected job to fail"));
            })
            .catch(function(e) {
                try {
                    expect(e).to.have.property('name').that.equals('Error');
                    expect(e).to.have.property('message').that.equals(
                        'Could not find serial number in path: ' +
                        'Builtin FRU Device (ID 0).Product Serial');
                    expect(mockWaterline.nodes.updateByIdentifier).to.not.have.been.called;
                    done();
                } catch (e) {
                    done(e);
                }
            });
        });

        it('Should fail if no valid serial number', function(done) {
            var catalog = {
                    "data": {
                        "Builtin FRU Device (ID 0)": {
                            "Product Serial": "..............",
                            "Product Version": "FFF"
                        }
                    },
                    "id": uuid.v4(),
                    "node": nodeId,
                    "source": "ipmi-fru",
                };

            this.sandbox.stub(mockWaterline.catalogs,'findMostRecent').resolves(catalog);

            job.run()
            .then(function() {
                done(new Error("Expected job to fail"));
            })
            .catch(function(e) {
                try {
                    expect(e).to.have.property('name').that.equals('Error');
                    expect(e).to.have.property('message').that.equals(
                        'No valid serial number in SN: ..............');
                    expect(mockWaterline.nodes.updateByIdentifier).to.not.have.been.called;
                    done();
                } catch (e) {
                    done(e);
                }
            });
        });
    });

    describe('Update enclosure and compute node', function() {

        beforeEach('Generate enclosure job update node', function() {
            var catalog = {
                "data": {
                    "Builtin FRU Device (ID 0)": {
                        "Product Serial": "ABC123"
                    }
                },
                "id": uuid.v4(),
                "node": nodeId,
                "source": "ipmi-fru",
            };

            job = new GenerateEnclJob({}, { target: nodeId }, uuid.v4());

            this.sandbox = sinon.sandbox.create();
            this.sandbox.stub(job, '_subscribeActiveTaskExists').resolves();
            this.sandbox.stub(mockWaterline.catalogs,'findMostRecent').resolves(catalog);
            this.sandbox.stub(mockWaterline.nodes,'updateByIdentifier').resolves();
        });

        afterEach('Generate enclosure job udpate node', function() {
            this.sandbox.restore();
        });

        it('Should create enclosure node and update when no match found', function() {
            var enclInput ={
                name: 'Enclosure Node ABC123',
                type: 'enclosure',
                relations: [{
                    relationType: 'encloses',
                    targets: []
                }]
            };
            var enclOutput = _.cloneDeep(enclInput);
            var enclId = uuid.v4();
            var enclRelation = {
                relations: [{
                    relationType: 'encloses',
                    targets: [nodeId]
                }]
            };
            var nodeRelation = {
                relations: [{
                    relationType: 'enclosedBy',
                    targets: [enclId]
                }]
            };

            enclOutput.id = enclId;

            this.sandbox.stub(mockWaterline.nodes,'find').resolves();
            this.sandbox.stub(mockWaterline.nodes,'create').resolves(enclOutput);

            return job.run()
            .then(function() {
                expect(mockWaterline.nodes.create).to.have.been.calledWith(enclInput);
                expect(mockWaterline.nodes.updateByIdentifier)
                .to.have.been.calledWith(enclId, enclRelation);
                expect(mockWaterline.nodes.updateByIdentifier)
                .to.have.been.calledWith(nodeId, nodeRelation);
            });

        });

        it('Should update enclosure and node when match found', function() {
            var enclId = uuid.v4();
            var otherNodeId = uuid.v4();
            var encl = [
                {
                    id: uuid.v4(),
                    name: 'Enclosure Node',
                    type: 'enclosure',
                    relations: [{
                        relationType: 'encloses',
                        targets: [otherNodeId]
                    }]
                },
                {
                    id: enclId,
                    name: 'Enclosure Node ABC123',
                    type: 'enclosure',
                    relations: [{
                        relationType: 'encloses',
                        targets: [otherNodeId]
                    }]
                },
            ];

            var nodeRelation = {
                relations: [{
                    relationType: 'enclosedBy',
                    targets: [enclId]
                }]
            };
            var enclRelation = {
                relations: [{
                    relationType: 'encloses',
                    targets: [otherNodeId, nodeId]
                }]
            };

            this.sandbox.stub(mockWaterline.nodes,'create');
            this.sandbox.stub(mockWaterline.nodes,'find').resolves(encl);

            return job.run()
            .then(function() {
                expect(mockWaterline.nodes.create).to.not.have.been.called;
                expect(mockWaterline.nodes.updateByIdentifier)
                .to.have.been.calledWith(enclId, enclRelation);
                expect(mockWaterline.nodes.updateByIdentifier)
                .to.have.been.calledWith(nodeId, nodeRelation);
            });
        });

    });

    describe('Actions when the job ran on node more than once', function() {

        beforeEach('Generate enclosure job action more than once', function() {
            var catalog = {
                "data": {
                    "Builtin FRU Device (ID 0)": {
                        "Product Serial": "ABC123"
                    }
                },
                "id": uuid.v4(),
                "node": nodeId,
                "source": "ipmi-fru",
            };

            job = new GenerateEnclJob({}, { target: nodeId }, uuid.v4());

            this.sandbox = sinon.sandbox.create();
            this.sandbox.stub(job, '_subscribeActiveTaskExists').resolves();
            this.sandbox.stub(mockWaterline.catalogs,'findMostRecent').resolves(catalog);
            this.sandbox.stub(mockWaterline.nodes,'create');
            this.sandbox.stub(mockWaterline.nodes,'updateByIdentifier').resolves();
        });

        afterEach('Generate enclosure job action more than once', function() {
            this.sandbox.restore();
        });

        it('Should not update enclosure node if ran more than once', function() {
            var enclId = uuid.v4();
            var encl = [{
                id: enclId,
                name: 'Enclosure Node ABC123',
                type: 'enclosure',
                relations: [{
                    relationType: 'encloses',
                    targets: [nodeId]
                }]
            }];

            this.sandbox.stub(mockWaterline.nodes,'find').resolves(encl);

            return job.run()
            .then(function() {
                expect(mockWaterline.nodes.create).to.not.have.been.called;
                expect(mockWaterline.nodes.updateByIdentifier)
                .to.not.have.been.calledWith(enclId);
            });
        });
    });
});
