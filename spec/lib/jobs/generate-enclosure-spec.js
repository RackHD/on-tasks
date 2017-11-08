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
            findByIdentifier: function(){},
            findOrCreate: function(){},
            updateFieldIfNotExistByIdentifier: function(){},
            addListItemsIfNotExistByIdentifier: function(){}
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
            this.sandbox.stub(mockWaterline.nodes,'findOrCreate');
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
                    expect(e).to.have.property('length').that.equals(4);
                    expect(e[0]).to.have.property('message').that.equals('empty catalog');
                    expect(e[1]).to.have.property('message').that.equals('empty catalog');
                    expect(e[2]).to.have.property('message').that.equals('empty catalog');
                    expect(e[3]).to.have.property('message').that.equals('empty catalog');
                    expect(mockWaterline.nodes.findOrCreate).to.not.have.been.called;
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
                            "Chassis Serial": "ABC123",
                            "Chassis Version": "FFF"
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
                    expect(e).to.have.property('length').that.equals(4);
                    expect(e[0]).to.have.property('message').that
                        .equals('Could not find serial number in source: ipmi-fru');
                    expect(e[1]).to.have.property('message').that.equals('empty catalog');
                    expect(e[2]).to.have.property('message').that
                        .equals('Could not find serial number in source: ipmi-fru');
                    expect(e[3]).to.have.property('message').that.equals('empty catalog');
                    expect(mockWaterline.nodes.findOrCreate).to.not.have.been.called;
                    done();
                } catch (e) {
                    done(e);
                }
            });
        });

        it('Should fail if no serial number item', function(done) {
            var catalog = {
                    "data": {
                        "Chassis Information": {
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
                    expect(e).to.have.property('length').that.equals(4);
                    expect(e[0]).to.have.property('message').that.equals('empty catalog');
                    expect(e[1]).to.have.property('message').that
                        .equals('Could not find serial number in source: dmi');
                    expect(e[2]).to.have.property('message').that.equals('empty catalog');
                    expect(e[3]).to.have.property('message').that
                        .equals('Could not find serial number in source: dmi');
                    expect(mockWaterline.nodes.findOrCreate).to.not.have.been.called;
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
                            "Chassis Serial": "... aa",
                            "Chassis Version": "FFF"
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
                    expect(e).to.have.property('length').that.equals(4);
                    expect(e[0]).to.have.property('message').that
                        .equal('No valid serial number in SN: ... aa');
                    expect(e[1]).to.have.property('message').that.equals('empty catalog');
                    expect(mockWaterline.nodes.findOrCreate).to.not.have.been.called;
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
                            "Chassis Serial": "...-aa",
                            "Chassis Version": "FFF"
                        }
                    },
                    "id": uuid.v4(),
                    "node": nodeId,
                    "source": "ipmi-fru",
                };

            var snPath = {
                src: 'ipmi-fru',
                entry: 'Builtin FRU Device (ID 0).Chassis Serial'
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
                        "Chassis Serial": "ABC123"
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

        it('Should throw error when failed to findOrCreate enclosure node', function(done) {
            this.sandbox.stub(mockWaterline.nodes,'findOrCreate').resolves();

            job.run()
            .catch(function(e) {
                try {
                    expect(e).to.equal('Could not create enclosure node');
                    done();
                } catch (e) {
                    done(e);
                }
            });
        });

        it('Should create or find enclosure node and update', function() {
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

            enclOutput.relations = [{
                relationType: 'encloses',
                targets: [nodeId]
            }];

            enclOutput.id = enclId;

            var enclQuery = { name: enclInput.name, type: enclInput.type };
            this.sandbox.stub(mockWaterline.nodes,'find').resolves();
            this.sandbox.stub(mockWaterline.nodes,'findOrCreate').resolves(enclOutput);
            this.sandbox.stub(job,'addRelation').resolves();
            this.sandbox.stub(mockWaterline.nodes,'findByIdentifier').resolves(node);

            return job.run()
            .then(function() {
                expect(mockWaterline.nodes.findOrCreate)
                .to.have.been.calledWith(enclQuery, enclInput);
                expect(job.addRelation).to.have.been.calledTwice;
                expect(job.addRelation).to.have.been.calledWith(enclOutput, 'encloses', nodeId);
                expect(job.addRelation).to.have.been.calledWith(node, 'enclosedBy', enclOutput);
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

            this.sandbox.stub(mockWaterline.nodes,'findOrCreate').resolves(encl);
            this.sandbox.stub(mockWaterline.nodes,'findByIdentifier').resolves();
            this.sandbox.stub(job,'addRelation').resolves(encl);
            job.run()
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
    });
});
