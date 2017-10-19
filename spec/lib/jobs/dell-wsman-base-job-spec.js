// Copyright, 2017, Dell, Inc.
/* jshint node: true */

'use strict';

var uuid = require('node-uuid'),
    util = require('util');

describe('', function() {
    var sandbox;
    var BaseJob;
    var MockJob;
    var job;
    var waterline;

    before(function() {
        var Waterline = {
            catalogs: {
                findLatestCatalogOfSource: function() {}
            },
            nodes: {
                findByIdentifier: function() {}
            },
            obms: {
                findByNode: function() {}
            }
        };
        helper.setupInjector(
            _.flattenDeep([
                helper.require('/lib/jobs/base-job.js'),
                helper.require('/lib/jobs/dell-wsman-base-job.js'),
                helper.di.simpleWrapper(Waterline,'Services.Waterline')
            ])
        );
        BaseJob = helper.injector.get('Job.Dell.Wsman.Base');
        waterline = helper.injector.get('Services.Waterline');
        sandbox = sinon.sandbox.create();

        function InnerMockJob() {
            var logger = helper.injector.get('Logger').initialize(InnerMockJob);
            InnerMockJob.super_.call(this, logger, {}, {}, uuid.v4());
        }
        util.inherits(InnerMockJob, BaseJob);

        InnerMockJob.prototype._initJob = function() {};
        InnerMockJob.prototype._handleSyncRequest = function() {};
        InnerMockJob.prototype._handleSyncResponse = function() {};
        InnerMockJob.prototype._handleAsyncRequest = function() { return this._done();};
        MockJob = InnerMockJob;
    });

    afterEach(function() {
        sandbox.restore();
    });

    describe('Subclassed methods', function() {
        beforeEach(function() {
            job = new MockJob();
            sandbox.stub(MockJob.prototype, '_initJob').resolves();
            sandbox.stub(MockJob.prototype, '_handleSyncRequest').resolves('response');
            sandbox.stub(MockJob.prototype, '_handleSyncResponse');
            sandbox.stub(MockJob.prototype, '_handleAsyncRequest', function() {
                return this._done();
            });
        });

        it('should call subclassed methods when it\'s a syncRequest derived class', function() {
            return job.run()
            .then(function() {
                expect(job._initJob).to.be.calledOnce;
                expect(job._handleSyncRequest).to.be.calledOnce;
                expect(job._handleSyncResponse).to.be.calledWith('response');
            });
        });

        it('should call subclassed methods when it\'s an asyncRequest derived class', function() {
            job._handleSyncRequest = undefined;
            job._handleSyncResponse = undefined;
            return job.run()
            .then(function() {
                expect(job._initJob).to.be.calledOnce;
                expect(job._handleAsyncRequest).to.have.been.calledOnce;
            });
        });
    });

    describe('Common methods', function() {
        var findLatestCatalogOfSource;
        var findByIdentifier;
        var findByNode;

        beforeEach(function() {
            job = new MockJob();
            findLatestCatalogOfSource =
                sandbox.stub(waterline.catalogs, 'findLatestCatalogOfSource');
            findByIdentifier = sandbox.stub(waterline.nodes, 'findByIdentifier');
            findByNode = sandbox.stub(waterline.obms, 'findByNode');
        });

        it('should getIpAddress from obm.config.host', function() {
            return job.getIpAddress({
                config: {
                    host: '127.0.0.1'
                }
            })
            .then(function(ipAddr) {
                expect(ipAddr).to.equal('127.0.0.1');
            });
        });

        it('should getIpAddress from DeviceSummary in catalog', function() {
            findLatestCatalogOfSource.onFirstCall()
            .resolves({
                data: {
                    id: '127.0.0.2'
                }
            });
            return job.getIpAddress()
            .then(function(ipAddr) {
                expect(findLatestCatalogOfSource).to.be.calledOnce;
                expect(ipAddr).to.equal('127.0.0.2');
            });
        });

        it('should getIpAddress from bmc in catalog', function() {
            findLatestCatalogOfSource.onFirstCall()
            .resolves();
            findLatestCatalogOfSource.onSecondCall()
            .resolves({
                data: {
                    'Ip Address': '127.0.0.3'
                }
            });
            return job.getIpAddress()
            .then(function(ipAddr) {
                expect(findLatestCatalogOfSource).to.be.calledTwice;
                expect(ipAddr).to.equal('127.0.0.3');
            });
        });

        it('should checkOBM when obm exists', function() {
            findByIdentifier.resolves({
                type: 'compute'
            });
            findByNode.resolves({
                host: '127.0.0.1'
            });
            return job.checkOBM('MockJob')
            .then(function(obm) {
                expect(findByIdentifier).to.be.calledOnce;
                expect(findByNode).to.be.calledOnce;
                expect(obm).to.deep.equal({
                    host: '127.0.0.1'
                });
            });
        });

        it('should checkOBM throw error when obm doesn\'t exist', function() {
            findByIdentifier.resolves({
                type: 'compute'
            });
            findByNode.resolves();
            expect(job.checkOBM('MockJob')).to.be
                .rejectedWith('Failed to find Wsman obm settings');
        });
    });
});
