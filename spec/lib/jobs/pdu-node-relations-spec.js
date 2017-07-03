// Copyright 2016, EMC, Inc.
/* jshint node:true */

'use strict';

describe(require('path').basename(__filename), function () {
    var PduRelationsJob;
    var uuid = require('node-uuid');
    var nodeId = '561885426cb1f2ea4486589d';
    var mockWaterline;
    var job;
    var _;

    mockWaterline = {
        nodes: {
            updateByIdentifier: function () { },
            findByIdentifier: function () { },
            needByIdentifier: function () { }
        },
        obms: {
            find: function () { }
        },
        ibms: {
            findByNode: function () { }
        }
    };

    before(function () {
        helper.setupInjector([
            helper.require('/lib/jobs/base-job'),
            helper.require('/lib/jobs/pdu-node-relations'),
            helper.di.simpleWrapper(mockWaterline, 'Services.Waterline')
        ]);
        _ = helper.injector.get('_');

        PduRelationsJob = helper.injector.get('Job.Catalog.PduRelations');
    });

    describe('Node data validation', function () {

        beforeEach('PDU node relations job node data validation', function () {
            job = new PduRelationsJob({}, { target: nodeId }, uuid.v4());

            this.sandbox = sinon.sandbox.create();
            this.sandbox.stub(job, '_subscribeActiveTaskExists').resolves();
            this.sandbox.stub(mockWaterline.nodes, 'updateByIdentifier');
            this.sandbox.stub(mockWaterline.obms, 'find').resolves();
            this.sandbox.stub(mockWaterline.ibms, 'findByNode').resolves();
        });

        afterEach('PDU node relations job node data validation', function () {
            this.sandbox.restore();
        });

        it('should fail if node running the task is not a pdu type', function (done) {
            var computeNode = {
                autoDiscover: true,
                type: 'compute',
                relations: [],
                id: nodeId
            };
            this.sandbox.stub(mockWaterline.nodes, 'needByIdentifier').resolves(computeNode);
            job.run()
            .then(function () {
                done(new Error('Expected job to fail'));
            })
            .catch(function (e) {
                try {
                    expect(e).to.have.property('name').that.equals('Error');
                    expect(e).to.have.property('message').that.equals('Task runs only on PDU nodes');
                    expect(mockWaterline.obms.find).to.not.have.been.called;
                    expect(mockWaterline.nodes.updateByIdentifier).to.not.have.been.called;
                    done();
                } catch (e) {
                    done(e);
                }
            });
        });
    });

    describe('Update poweredBy relationtype in nodes', function () {
        var needByIdentifier;
        var computeNodeId;
        var node;
        var obms;
        var pduNode;
        var snmpSettings;
        beforeEach('PDU node relations job update node', function () {

            job = new PduRelationsJob({}, { target: nodeId }, uuid.v4());
            computeNodeId = '578f696bf8570ac768d2247e';
            obms = [
                {
                    node: computeNodeId,
                    config: {
                        host: '11.12.123.1',
                        user: 'admin'
                    },
                    id: '578f6989f8570ac768d22486'
                }
            ];
            pduNode = {
                autoDiscover: true,
                type: 'pdu',
                relations: [],
                id: nodeId
            };
            snmpSettings = {
                config: {
                    host: '11.12.123.1',
                    community: 'public'
                }
            };
            node = {
                workflows: [],
                catalogs: [],
                relations: [],
                id: computeNodeId
            };

            this.sandbox = sinon.sandbox.create();
            this.sandbox.stub(job, '_subscribeActiveTaskExists').resolves();
            this.sandbox.stub(mockWaterline.nodes, 'updateByIdentifier').resolves();
            this.sandbox.stub(mockWaterline.obms, 'find').resolves(obms);
            this.sandbox.stub(mockWaterline.ibms, 'findByNode').resolves(snmpSettings);
            this.sandbox.stub(mockWaterline.nodes, 'findByIdentifier').resolves(node);
            needByIdentifier = this.sandbox.stub(mockWaterline.nodes, 'needByIdentifier');

        });

        afterEach('PDU node relations job udpate node', function () {
            this.sandbox.restore();
        });

        it('it should call update by Identifier with new relation type', function () {
            var nodeRelation = {
                relations: [
                    {
                        'relationType': 'poweredBy',
                        'targets': [nodeId]
                    }
                ]
            };

            var pduRelation = {
                relations: [
                    {
                        'relationType': 'powers',
                        'targets': [computeNodeId]
                    }
                ]
            };

            needByIdentifier.resolves(pduNode);

            job.run()
            .then(function () {
                expect(mockWaterline.nodes.updateByIdentifier)
                .to.have.been.calledWith(computeNodeId, nodeRelation);
                expect(mockWaterline.nodes.updateByIdentifier)
                .to.have.been.calledWith(pduNode.id, pduRelation);
            });
        });

        it('it should not duplicate entries in pdu relationtype equal to powers', function () {
            var nodeRelation = {
                relations: [
                    {
                        'relationType': 'poweredBy',
                        'targets': [nodeId]
                    }
                ]
            };

            var pduRelation = {
                relations: [
                    {
                        'relationType': 'powers',
                        'targets': [computeNodeId, 'secondNode']
                    }
                ]
            };

            pduNode = {
                autoDiscover: true,
                type: 'pdu',
                relations: pduRelation.relations,
                id: nodeId
            };
            needByIdentifier.resolves(pduNode);

            job.run()
            .then(function () {
                expect(mockWaterline.nodes.updateByIdentifier)
                .to.have.been.calledWith(computeNodeId, nodeRelation);
                expect(mockWaterline.nodes.updateByIdentifier)
                .to.have.been.calledWith(pduNode.id, pduRelation);
            });
        });

        it('it should fail if node id found in obms does not match any node', function (done) {
            needByIdentifier.rejects('Could not find node with identifier ' + computeNodeId);
            job.run()
            .then(function () {
                done(new Error('Expected job to fail'));
            })
            .catch(function (e) {
                try {
                    expect(e).to.have.property('name').that.equals('Error');
                    expect(e).to.have.property('message').that.equals('Could not find node with identifier ' + computeNodeId);
                    expect(mockWaterline.nodes.updateByIdentifier).to.not.have.been.called;
                    done();
                } catch (e) {
                    done(e);
                }
            });
        });
    });
});