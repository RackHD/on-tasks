// Copyright 2016, EMC, Inc.
/* jshint node:true */

'use strict';

describe(require('path').basename(__filename), function () {
    var SwitchRelationsJob;
    var uuid = require('node-uuid');
    var nodeId = '561885426cb1f2ea4486589d';
    var mockWaterline;
    var job;
    var _;

    mockWaterline = {
        nodes: {
            find: function () { },
            create: function () { },
            updateByIdentifier: function () { },
            findByIdentifier: function () { }
        },
        catalogs: {
            findMostRecent: function () { },
            find: function () { }
        }
    };

    before(function () {
        helper.setupInjector([
            helper.require('/lib/jobs/base-job'),
            helper.require('/lib/jobs/switch-node-relations'),
            helper.require('/lib/utils/job-utils/catalog-searcher.js'),
            helper.di.simpleWrapper(mockWaterline, 'Services.Waterline')
        ]);
        _ = helper.injector.get('_');

        SwitchRelationsJob = helper.injector.get('Job.Catalog.SwitchRelations');
    });

    describe('Node data validation', function () {

        beforeEach('Switch node relations job node data validation', function () {
            job = new SwitchRelationsJob({}, { target: nodeId }, uuid.v4());

            this.sandbox = sinon.sandbox.create();
            this.sandbox.stub(job, '_subscribeActiveTaskExists').resolves();
            this.sandbox.stub(mockWaterline.nodes, 'updateByIdentifier');
            this.sandbox.stub(mockWaterline.nodes, 'find').resolves();
        });

        afterEach('Switch node relations job node data validation', function () {
            this.sandbox.restore();
        });

        it('should fail if switch catalog does not exist', function (done) {
            this.sandbox.stub(mockWaterline.catalogs, 'findMostRecent').rejects('empty catalog');
            job.run()
            .then(function () {
                done(new Error("Expected job to fail"));
            })
            .catch(function (e) {
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

        it('should fail if no expected entry in catalog', function (done) {
            var catalog = {
                "data": {
                },
                "id": uuid.v4(),
                "node": "123",
                "source": "snmp-1",
            };

            var findMostRecent = this.sandbox.stub(mockWaterline.catalogs, 'findMostRecent');
            findMostRecent.withArgs({
                node: nodeId,
                source: 'snmp-1'
            }).resolves(catalog);

            job.run()
            .then(function () {
                done(new Error("Expected job to fail"));
            })
            .catch(function (e) {
                try {
                    expect(e).to.have.property('name').that.equals('Error');
                    expect(e).to.have.property('message').that
                        .equals('couldnt find ports mac addresses in catalog');
                    expect(mockWaterline.nodes.updateByIdentifier).to.not.have.been.called;
                    done();
                } catch (e) {
                    done(e);
                }
            });
        });

        it('Should fail if no catalogs with lldp source available', function (done) {
            var findMostRecent = this.sandbox.stub(mockWaterline.catalogs, 'findMostRecent');
            var find = this.sandbox.stub(mockWaterline.catalogs, 'find');
            var catalog = {
                "data": {
                    "IF-MIB::ifPhysAddress_1": "0:1c:73:e1:6:32",
                    "IF-MIB::ifPhysAddress_2": "0:1c:73:e1:6:33",
                    "IF-MIB::ifPhysAddress_3": "0:1c:73:e1:6:34",
                    "IF-MIB::ifPhysAddress_4": "0:1c:73:e1:6:35",
                },
                "id": uuid.v4(),
                "node": "123",
                "source": "snmp-1",
            };

            find.withArgs({
                source: 'lldp'
            }).rejects('empty catalog');

            findMostRecent.withArgs({
                node: nodeId,
                source: 'snmp-1'
            }).resolves(catalog);

            job.run()
            .then(function () {
                done(new Error("Expected job to fail"));
            })
            .catch(function (e) {
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

        it('it should fail if lldp catalogs doesnt contain expected data', function (done) {
            var findMostRecent = this.sandbox.stub(mockWaterline.catalogs, 'findMostRecent');
            var find = this.sandbox.stub(mockWaterline.catalogs, 'find');
            var switchCatalog = {
                "data": {
                    "IF-MIB::ifPhysAddress_1": "0:1c:73:e1:6:32",
                    "IF-MIB::ifPhysAddress_2": "0:1c:73:e1:6:33",
                    "IF-MIB::ifPhysAddress_3": "0:1c:73:e1:6:34",
                    "IF-MIB::ifPhysAddress_4": "0:1c:73:e1:6:35",
                },
                "id": uuid.v4(),
                "node": "123",
                "source": "snmp-1",
            };

            var lldpCatalogs = [
                {
                    source: 'lldp',
                    data: {
                        'eth': {
                            'port': {
                                'ifname': 'Ethernet1'
                            }
                        }
                    },
                    node: 'nodeid'
                }
            ];

            find.withArgs({
                source: 'lldp'
            }).resolves(lldpCatalogs);

            findMostRecent.withArgs({
                node: nodeId,
                source: 'snmp-1'
            }).resolves(switchCatalog);

            job.run()
            .then(function () {
                done(new Error("Expected job to fail"));
            })
            .catch(function (e) {
                try {
                    expect(e).to.have.property('name').that.equals('Error');
                    expect(e).to.have.property('message').that.
                        equals('cant find mac address in lldp data for node nodeid port eth');
                    expect(mockWaterline.nodes.updateByIdentifier).to.not.have.been.called;
                    done();
                } catch (e) {
                    done(e);
                }
            });
        });

        it('it should fail if lldp catalogs data contains invalid mac format', function (done) {
            var findMostRecent = this.sandbox.stub(mockWaterline.catalogs, 'findMostRecent');
            var find = this.sandbox.stub(mockWaterline.catalogs, 'find');
            var switchCatalog = {
                "data": {
                    "IF-MIB::ifPhysAddress_1": "0:1c:73:e1:6:32",
                    "IF-MIB::ifPhysAddress_2": "0:1c:73:e1:6:33",
                    "IF-MIB::ifPhysAddress_3": "0:1c:73:e1:6:34",
                    "IF-MIB::ifPhysAddress_4": "0:1c:73:e1:6:35",
                },
                "id": uuid.v4(),
                "node": "123",
                "source": "snmp-1",
            };

            var lldpCatalogs = [
                {
                    source: 'lldp',
                    data: {
                        'eth': {
                            'chassis': {
                                'mac': '0-0-0-0-0-0'
                            },
                            'port': {
                                'ifname': 'Ethernet1'
                            }
                        }
                    },
                    node: 'nodeid'
                }
            ];

            find.withArgs({
                source: 'lldp'
            }).resolves(lldpCatalogs);

            findMostRecent.withArgs({
                node: nodeId,
                source: 'snmp-1'
            }).resolves(switchCatalog);

            job.run()
            .then(function () {
                done(new Error("Expected job to fail"));
            })
            .catch(function (e) {
                try {
                    expect(e).to.have.property('name').that.equals('Error');
                    expect(e).to.have.property('message').
                        that.equals('mac: 0-0-0-0-0-0 bad format');
                    expect(mockWaterline.nodes.updateByIdentifier).to.not.have.been.called;
                    done();
                } catch (e) {
                    done(e);
                }
            });
        });

        it('it should fail if lldp catalogs belong to an invalid node', function (done) {
            var findMostRecent = this.sandbox.stub(mockWaterline.catalogs, 'findMostRecent');
            var find = this.sandbox.stub(mockWaterline.catalogs, 'find');
            this.sandbox.stub(mockWaterline.nodes, 'findByIdentifier').resolves(null);
            var switchCatalog = {
                "data": {
                    "IF-MIB::ifPhysAddress_1": "0:1c:73:e1:6:32",
                    "IF-MIB::ifPhysAddress_2": "0:1c:73:e1:6:33",
                    "IF-MIB::ifPhysAddress_3": "0:1c:73:e1:6:34",
                    "IF-MIB::ifPhysAddress_4": "0:1c:73:e1:6:35",
                },
                "id": uuid.v4(),
                "node": "123",
                "source": "snmp-1",
            };

            var lldpCatalogs = [
                {
                    source: 'lldp',
                    data: {
                        'eth': {
                            'chassis': {
                                'mac': '0:1c:73:e1:6:35'
                            },
                            'port': {
                                'ifname': 'Ethernet1'
                            }
                        }
                    },
                    node: 'nodeid'
                }
            ];

            find.withArgs({
                source: 'lldp'
            }).resolves(lldpCatalogs);

            findMostRecent.withArgs({
                node: nodeId,
                source: 'snmp-1'
            }).resolves(switchCatalog);

            job.run()
            .then(function () {
                done(new Error("Expected job to fail"));
            })
            .catch(function (e) {
                try {
                    expect(e).to.be.equals('Could not find node with identifier nodeid');
                    expect(mockWaterline.nodes.updateByIdentifier).to.not.have.been.called;
                    done();
                } catch (e) {
                    done(e);
                }
            });
        });

    });

    describe('Update connectsTo relationtype in nodes', function () {
        var findByIdentifier;

        beforeEach('Switch node relations job update node', function () {

            var switchCatalog = {
                "data": {
                    "IF-MIB::ifPhysAddress_1": "0:1c:73:e1:6:32",
                    "IF-MIB::ifPhysAddress_2": "0:1c:73:e1:6:33",
                    "IF-MIB::ifPhysAddress_3": "0:1c:73:e1:6:34",
                    "IF-MIB::ifPhysAddress_4": "0:1c:73:e1:6:35",
                },
                "id": uuid.v4(),
                "node": "123",
                "source": "snmp-1",
            };

            var lldpCatalogs = [
                {
                    source: 'lldp',
                    data: {
                        'eth': {
                            'port': {
                                'ifname': 'Ethernet1'
                            },
                            'chassis': {
                                'mac': '00:1c:73:e1:6:34'
                            },
                        }
                    },
                    node: 'nodeid'
                }
            ];

            job = new SwitchRelationsJob({}, { target: nodeId }, uuid.v4());

            this.sandbox = sinon.sandbox.create();
            this.sandbox.stub(job, '_subscribeActiveTaskExists').resolves();
            findByIdentifier = this.sandbox.stub(mockWaterline.nodes, 'findByIdentifier');
            this.sandbox.stub(mockWaterline.nodes, 'updateByIdentifier').resolves();
            var findMostRecent = this.sandbox.stub(mockWaterline.catalogs, 'findMostRecent');
            var find = this.sandbox.stub(mockWaterline.catalogs, 'find');
            find.withArgs({
                source: 'lldp'
            }).resolves(lldpCatalogs);

            findMostRecent.withArgs({
                node: nodeId,
                source: 'snmp-1'
            }).resolves(switchCatalog);


        });

        afterEach('Switch node relations job udpate node', function () {
            this.sandbox.restore();
        });

        it('it should call update by Identifier with new relation type', function () {
            var node = {
                'workflows': [],
                'catalogs': [],
                'relations': [],
                'id': 'nodeid'
            };
            var nodeRelation = {
                relations: [
                    {
                        'relationType': 'connectsTo',
                        'targets': [nodeId],
                        'info': {
                            "eth": {
                                "destMac": "00:1c:73:e1:6:34",
                                "destPort": "Ethernet1"
                            }
                        }
                    }
                ]
            };
            findByIdentifier.resolves(node);
            job.run()
            .then(function () {
                expect(mockWaterline.nodes.updateByIdentifier)
                .to.have.been.calledWith('nodeid', nodeRelation);
            });
        });

        it('it should always update an existing relation if discovery is run twice', function () {
            var node = {
                'workflows': [],
                'catalogs': [],
                'relations': [
                {
                    'relationType': 'connectsTo',
                    'targets': [nodeId],
                    'info': {
                        "eth": {
                            "destMac": "00:1c:73:e1:6:33",
                            "destPort": "Ethernet2"
                        }
                    }
                }],
                'id': 'nodeid'
            };
            var nodeRelation = {
                relations: [
                    {
                        'relationType': 'connectsTo',
                        'targets': [nodeId],
                        'info': {
                            "eth": {
                                "destMac": "00:1c:73:e1:6:34",
                                "destPort": "Ethernet1"
                            }
                        }
                    }
                ]
            };
            findByIdentifier.resolves(node);
            job.run()
            .then(function () {
                expect(mockWaterline.nodes.updateByIdentifier)
                .to.have.been.calledWith('nodeid', nodeRelation);
            });
        });
    });
});