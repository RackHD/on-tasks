// Copyright 2015, EMC, Inc.
/* jshint node:true */

'use strict';

describe(require('path').basename(__filename), function () {
    var GenerateEnclJob;
    var uuid = require('node-uuid');
    var nodeId = '561885426cb1f2ea4486589d';
    var mockWaterline;
    var job;
    var _;

    mockWaterline = {
        nodes: {
            find: function(){},
            create: function(){},
            updateByIdentifier: function(){},
            findByIdentifier: function(){}
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
        _ = helper.injector.get('_');

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

        it('should fail if all catalogs does not exist', function(done) {
            this.sandbox.stub(mockWaterline.catalogs,'findMostRecent').rejects('empty catalog');
            job.run()
            .then(function() {
                done(new Error("Expected job to fail"));
            })
            .catch(function(e) {
                try {
                    expect(e).to.have.property('name').that.equals('AggregateError');
                    expect(e).to.have.property('length').that.equals(2);
                    expect(e[0]).to.have.property('message').that.equals('empty catalog');
                    expect(e[1]).to.have.property('message').that.equals('empty catalog');
                    expect(mockWaterline.nodes.updateByIdentifier).to.not.have.been.called;
                    done();
                } catch (e) {
                    done(e);
                }
            });
        });

        it('Should fail if no expected entry in catalog', function(done) {
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

            var findMostRecent = this.sandbox.stub(mockWaterline.catalogs,'findMostRecent');
            findMostRecent.withArgs({
                node: nodeId,
                source: 'ipmi-fru'
            }).resolves(catalog);
            findMostRecent.withArgs({
                node: nodeId,
                source: 'dmi'
            }).rejects('empty catalog');

            job.run()
            .then(function() {
                done(new Error("Expected job to fail"));
            })
            .catch(function(e) {
                try {
                    expect(e).to.have.property('name').that.equals('AggregateError');
                    expect(e).to.have.property('length').that.equals(2);
                    expect(e[0]).to.have.property('message').that
                        .equals('Could not find serial number in source: ipmi-fru');
                    expect(e[1]).to.have.property('message').that.equals('empty catalog');
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
                        "System Information": {
                            "Part Number": "FFF"
                        }
                    },
                    "id": uuid.v4(),
                    "node": nodeId,
                    "source": "dmi",
                };

            var findMostRecent = this.sandbox.stub(mockWaterline.catalogs,'findMostRecent');
            findMostRecent.withArgs({
                node: nodeId,
                source: 'dmi'
            }).resolves(catalog);
            findMostRecent.withArgs({
                node: nodeId,
                source: 'ipmi-fru'
            }).rejects('empty catalog');

            job.run()
            .then(function() {
                done(new Error("Expected job to fail"));
            })
            .catch(function(e) {
                try {
                    expect(e).to.have.property('name').that.equals('AggregateError');
                    expect(e).to.have.property('length').that.equals(2);
                    expect(e[0]).to.have.property('message').that.equals('empty catalog');
                    expect(e[1]).to.have.property('message').that
                        .equals('Could not find serial number in source: dmi');
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
                            "Product Serial": "... aa",
                            "Product Version": "FFF"
                        }
                    },
                    "id": uuid.v4(),
                    "node": nodeId,
                    "source": "ipmi-fru",
                };

            var findMostRecent = this.sandbox.stub(mockWaterline.catalogs,'findMostRecent');
            findMostRecent.withArgs({
                node: nodeId,
                source: 'ipmi-fru'
            }).resolves(catalog);
            findMostRecent.withArgs({
                node: nodeId,
                source: 'dmi'
            }).rejects('empty catalog');

            job.run()
            .then(function() {
                done(new Error("Expected job to fail"));
            })
            .catch(function(e) {
                try {
                    expect(e).to.have.property('name').that.equals('AggregateError');
                    expect(e).to.have.property('length').that.equals(2);
                    expect(e[0]).to.have.property('message').that
                        .equal('No valid serial number in SN: ... aa');
                    expect(e[1]).to.have.property('message').that.equals('empty catalog');
                    expect(mockWaterline.nodes.updateByIdentifier).to.not.have.been.called;
                    done();
                } catch (e) {
                    done(e);
                }
            });
        });

        it('Should success if dash in serial number', function() {
            var catalog = {
                    "data": {
                        "Builtin FRU Device (ID 0)": {
                            "Product Serial": "...-aa",
                            "Product Version": "FFF"
                        }
                    },
                    "id": uuid.v4(),
                    "node": nodeId,
                    "source": "ipmi-fru",
                };

            var snPath = {
                src: 'ipmi-fru',
                entry: 'Builtin FRU Device (ID 0).Product Serial'
            };

            var findMostRecent = this.sandbox.stub(mockWaterline.catalogs,'findMostRecent');

            findMostRecent.resolves(catalog);

            return job._findSerialNumber(snPath)
            .then(function(sn) {
                expect(sn).to.equal('...-aa');
            });
        });

    });

    describe('Update enclosure and compute node', function() {
        var findMostRecent;

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

            job = new GenerateEnclJob({ "nodeId": nodeId }, {}, uuid.v4());

            this.sandbox = sinon.sandbox.create();
            this.sandbox.stub(job, '_subscribeActiveTaskExists').resolves();
            this.sandbox.stub(mockWaterline.nodes,'updateByIdentifier').resolves();

            findMostRecent = this.sandbox.stub(mockWaterline.catalogs,'findMostRecent');
            findMostRecent.withArgs({
                node: nodeId,
                source: 'ipmi-fru'
            }).resolves(catalog);
            findMostRecent.withArgs({
                node: nodeId,
                source: 'dmi'
            }).rejects('empty catalog');

        });

        afterEach('Generate enclosure job udpate node', function() {
            this.sandbox.restore();
        });

        it('Should throw error when failed to create enclosure node', function(done) {
            this.sandbox.stub(mockWaterline.nodes,'find').resolves();
            this.sandbox.stub(mockWaterline.nodes,'create').resolves();

            return job.run()
            .then(function() {
                done(new Error("Expected job to fail"));
            })
            .catch(function(e) {
                try {
                    expect(e).to.equal('Could not create enclosure node');
                    done();
                } catch (e) {
                    done(e);
                }
            });
        });

        it('Should create enclosure node and update when no match found', function() {
            var node = {
                id: nodeId,
                relations: []
            };
            var enclInput = {
                name: 'Enclosure Node ABC123',
                type: 'enclosure',
                relations: []
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
            this.sandbox.stub(mockWaterline.nodes,'findByIdentifier').resolves(node);

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
            var node = {
                id: nodeId,
                relations: []
            };
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
            this.sandbox.stub(mockWaterline.nodes,'findByIdentifier').resolves(node);
            return job.run()
            .then(function() {
                expect(mockWaterline.nodes.create).to.not.have.been.called;
                expect(mockWaterline.nodes.updateByIdentifier)
                .to.have.been.calledWith(enclId, enclRelation);
                expect(mockWaterline.nodes.updateByIdentifier)
                .to.have.been.calledWith(nodeId, nodeRelation);
            });
        });

        it('Should update enclosure node when it does not have targets', function() {
            var node = {
                id: nodeId,
                relations: []
            };
            var enclId = uuid.v4();
            var encl = [
                {
                    id: enclId,
                    name: 'Enclosure Node ABC123',
                    type: 'enclosure',
                    relations: []
                },
            ];

            var enclRelation = {
                relations: [{
                    relationType: 'encloses',
                    targets: [nodeId]
                }]
            };

            this.sandbox.stub(mockWaterline.nodes,'create');
            this.sandbox.stub(mockWaterline.nodes,'find').resolves(encl);
            this.sandbox.stub(mockWaterline.nodes,'findByIdentifier').resolves(node);
            return job.run()
            .then(function() {
                expect(mockWaterline.nodes.create).to.not.have.been.called;
                expect(mockWaterline.nodes.updateByIdentifier)
                    .to.have.been.calledWith(enclId, enclRelation);
            });
        });

        it('Should not override other relations when update node', function() {
            var node = {
                id: nodeId,
                relations: [
                    {
                        relationType: 'poweredBy',
                        targets: 'bbb'
                    }
                ]
            };
            var enclId = uuid.v4();
            var encl = [
                {
                    id: enclId,
                    name: 'Enclosure Node ABC123',
                    type: 'enclosure',
                    relations: [
                        {
                           relationType: 'poweredBy',
                           targets: 'aaa'
                        }
                    ]
                },
            ];
            var enclRelation = _.cloneDeep(encl[0].relations);
            enclRelation.push({
                relationType: 'encloses',
                targets: [nodeId]
            });
            var nodeRelation = _.cloneDeep(node.relations);
            nodeRelation.push({
                relationType: 'enclosedBy',
                targets: [enclId]
            });

            this.sandbox.stub(mockWaterline.nodes,'create');
            this.sandbox.stub(mockWaterline.nodes,'find').resolves(encl);
            this.sandbox.stub(mockWaterline.nodes,'findByIdentifier').resolves(node);
            return job.run()
            .then(function() {
                expect(mockWaterline.nodes.create).to.not.have.been.called;
                expect(mockWaterline.nodes.updateByIdentifier)
                    .to.have.been.calledWith(enclId, {relations: enclRelation});
                expect(mockWaterline.nodes.updateByIdentifier)
                    .to.have.been.calledWith(nodeId, {relations: nodeRelation});
            });
        });

        it('Should throw error when cannot find compute node', function(done) {
            var encl = [
                {
                    id: 'aaa',
                    name: 'Enclosure Node ABC123',
                    type: 'enclosure',
                    relations: []
                },
            ];

            this.sandbox.stub(mockWaterline.nodes,'create').resolves();
            this.sandbox.stub(mockWaterline.nodes,'find').resolves(encl);
            this.sandbox.stub(mockWaterline.nodes,'findByIdentifier').resolves();
            return job.run()
            .then(function() {
                done(new Error("Expected job to fail"));
            })
            .catch(function(e) {
                try {
                    expect(e).to.equal('Could not find node with identifier ' + nodeId);
                    expect(mockWaterline.nodes.updateByIdentifier).to.not.have.been
                        .calledWith(nodeId);
                    done();
                } catch (e) {
                    done(e);
                }
            });
        });

        it('Should update node when it already has one enclosure relation', function() {
            var node = {
                id: nodeId,
                relations: [
                    {
                        relationType: 'enclosedBy',
                        targets: ['bbb']
                    }
                ]
            };
            var enclId = uuid.v4();
            var encl = [
                {
                    id: enclId,
                    name: 'Enclosure Node ABC123',
                    type: 'enclosure',
                    relations: [
                        {
                           relationType: 'poweredBy',
                           targets: ['aaa']
                        }
                    ]
                },
            ];
            var enclRelation = _.cloneDeep(encl[0].relations);
            enclRelation.push({
                relationType: 'encloses',
                targets: [nodeId]
            });
            var nodeRelation = [{
                relationType: 'enclosedBy',
                targets: [enclId]
            }];

            this.sandbox.stub(mockWaterline.nodes,'create');
            this.sandbox.stub(mockWaterline.nodes,'find').resolves(encl);
            this.sandbox.stub(mockWaterline.nodes,'findByIdentifier').resolves(node);

            return job.run()
            .then(function() {
                expect(mockWaterline.nodes.create).to.not.have.been.called;
                expect(mockWaterline.nodes.updateByIdentifier)
                    .to.have.been.calledWith(enclId, {relations: enclRelation});
                expect(mockWaterline.nodes.updateByIdentifier)
                    .to.have.been.calledWith(nodeId, {relations: nodeRelation});
            });
        });
    });

    describe('Actions when the job ran on node more than once', function() {
        var findMostRecent;

        beforeEach('Generate enclosure job action more than once', function() {
            var catalog = {
                "data": {
                    "System Information": {
                        "Serial Number": "ABC123"
                    }
                },
                "id": uuid.v4(),
                "node": nodeId,
                "source": "dmi",
            };

            job = new GenerateEnclJob({}, { target: nodeId }, uuid.v4());

            this.sandbox = sinon.sandbox.create();
            this.sandbox.stub(job, '_subscribeActiveTaskExists').resolves();
            this.sandbox.stub(mockWaterline.nodes,'create');
            this.sandbox.stub(mockWaterline.nodes,'updateByIdentifier').resolves();

            findMostRecent = this.sandbox.stub(mockWaterline.catalogs,'findMostRecent');
            findMostRecent.withArgs({
                node: nodeId,
                source: 'ipmi-fru'
            }).rejects('empty catalog');
            findMostRecent.withArgs({
                node: nodeId,
                source: 'dmi'
            }).resolves(catalog);

        });

        afterEach('Generate enclosure job action more than once', function() {
            this.sandbox.restore();
        });

        it('Should not update node if ran more than once', function() {
            var enclId = uuid.v4();
            var node = {
                id: nodeId,
                relations: [{
                    relationType: 'enclosedBy',
                    targets: [enclId]
                }]
            };
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
            this.sandbox.stub(mockWaterline.nodes,'findByIdentifier').resolves(node);

            return job.run()
            .then(function() {
                expect(mockWaterline.nodes.create).to.not.have.been.called;
                expect(mockWaterline.nodes.updateByIdentifier).to.not.have.been.called;
            });
        });
    });
});
