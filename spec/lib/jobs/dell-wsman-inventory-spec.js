// Copyright © 2017 Dell Inc. or its subsidiaries.  All Rights Reserved.

'use strict';

var uuid = require('node-uuid');

describe(require('path').basename(__filename), function() {
    var WsmanInventoryJobClass;
    var wsmanInventoryJob;
    var wsmanBaseJob;
    var wsmanTool;
    var logger;
    var configuration;
    var mockWaterline;
    var loggerSpy;
    var doneSpy;

    var obm = {
        id: '59c4797e70bf1d7c172930dc',
        node: '/api/2.0/nodes/59c4720870bf1d7c172930db',
        service: 'dell-wsman-obm-service',
        config: {
            user: "admin",
            host: "172.31.128.73"
        }
    };

     var dellConfigs = {
         "wsmanCallbackUri": "http://172.31.128.1:9988/api/2.0/wsmanCallback/_IDENTIFIER_",
         "gateway": "http://localhost:46011","services": {
             "inventory": {
                "serverCallback": "http://localhost:46011/api/1.0/server/inventory/callback",
            }
        }
    };

    before(function() {
        helper.setupInjector([
            helper.require('/lib/utils/job-utils/wsman-tool.js'),
            helper.require('/lib/jobs/base-job.js'),
            helper.require('/lib/jobs/dell-wsman-base-job'),
            helper.require('/lib/jobs/dell-wsman-inventory.js'),
        ]);
        WsmanInventoryJobClass = helper.injector.get('Job.Dell.Wsman.Inventory');
        configuration = helper.injector.get('Services.Configuration');
        wsmanTool = helper.injector.get('JobUtils.WsmanTool');
        mockWaterline = helper.injector.get('Services.Waterline');
        wsmanBaseJob = helper.injector.get('Job.Dell.Wsman.Base');
        wsmanInventoryJob = new WsmanInventoryJobClass({}, {}, uuid.v4());
        logger = helper.injector.get('Logger');
        loggerSpy = sinon.spy(logger.prototype, 'error');
        doneSpy = sinon.spy(wsmanInventoryJob, '_done');
        this.sandbox = sinon.sandbox.create();
    });

    beforeEach(function() {
        this.sandbox.stub(wsmanBaseJob.prototype, 'checkOBM');
        this.sandbox.stub(wsmanBaseJob.prototype, 'getIpAddress');
        this.sandbox.stub(wsmanBaseJob.prototype, '_subscribeHttpResponseUuid');
        this.sandbox.stub(configuration, 'get');
        this.sandbox.stub(WsmanInventoryJobClass.prototype, '_handleAsyncRequest');
        this.sandbox.stub(WsmanInventoryJobClass.prototype, 'handleAsyncResponse');
        mockWaterline.catalogs = {
            findLatestCatalogOfSource: this.sandbox.stub(),
            updateByIdentifier: this.sandbox.stub(),
            create: this.sandbox.stub()
        };
        this.sandbox.stub(wsmanTool.prototype, 'clientRequest');
    });

    afterEach(function() {
        this.sandbox.restore();
    });

    describe('initJob', function() {
        it('should handle the case of lacking dell configuration.', function() {
            wsmanBaseJob.prototype.checkOBM.resolves(obm);
            configuration.get.withArgs('dell').returns(undefined);
            expect(wsmanInventoryJob._initJob()).to.be.rejectedWith('Dell Inventory web service is not defined in smiConfig.json.');
        });

        it('should handle the case of incorrect obm setting that ip address is undefined.', function() {
            wsmanBaseJob.prototype.checkOBM.resolves(obm);
            configuration.get.withArgs('dell').returns(dellConfigs);
            wsmanBaseJob.prototype.getIpAddress.resolves(undefined);
            expect(wsmanInventoryJob._initJob()).to.be.rejectedWith('No target IP address.');
        });

        it('should handle the case of incorrect node type', function() {
            wsmanInventoryJob.nodeType = 'unknown';
            wsmanBaseJob.prototype.checkOBM.resolves(obm);
            configuration.get.withArgs('dell').returns(dellConfigs);
            wsmanBaseJob.prototype.getIpAddress.resolves('172.31.128.73');
            expect(wsmanInventoryJob._initJob()).to.be.rejectedWith('Inventory collection for node type (unknown) is not implemented.');
        });

        it('should init job correctly', function() {
            wsmanInventoryJob.nodeType = 'compute';
            wsmanBaseJob.prototype.checkOBM.resolves(obm);
            configuration.get.withArgs('dell').returns(dellConfigs);
            wsmanBaseJob.prototype.getIpAddress.resolves('172.31.128.73');
            return wsmanInventoryJob._initJob().then(function() {
                expect(wsmanInventoryJob.inventories.length).to.equal(4);
                expect(wsmanInventoryJob.inventories[0]).to.equal('hardware');
            });
        });
    });

    describe('inventoryCallback', function() {
        it('should handle the callback from smi service', function() {
            var data = {
                type: 'nics',
                data: {
                    body: 'fake nic json string'
                }
            };
            wsmanInventoryJob.nodeId = '59c4720870bf1d7c172930db';
            WsmanInventoryJobClass.prototype.handleAsyncResponse.resolves();
            WsmanInventoryJobClass.prototype._handleAsyncRequest.resolves();
            return wsmanInventoryJob.inventoryCallback(data).then(function() {
                expect(WsmanInventoryJobClass.prototype._handleAsyncRequest).to.have.been.calledOnce;
            });
        });
    });

    describe('handleAsyncResponse', function() {
        var data = {
            id: 0,
            fqdd: 'NIC.Embedded.2-1-1',
            productName: 'Intel(R) Ethernet 10G X520 LOM - 7C:D3:0A:B0:52:A0'
        };
        var catalog = {
            id: '59c4720870bf1d7c172930db',
            source: 'software',
            data: {
                componentType: {
                    value: 'FRMW',
                    otherAttributes: {}
                },
                elementName: {
                    value: 'Integrated Dell Remote Access Controller',
                    otherAttributes: {}
                }
            }
        };

        beforeEach(function() {
            loggerSpy.reset();
            WsmanInventoryJobClass.prototype.handleAsyncResponse.restore();
        });

        it('should handle the case that no catalog created.', function() {
            wsmanInventoryJob.retrys = [ 'software' ];
            wsmanInventoryJob.inventories = [];
            return wsmanInventoryJob.handleAsyncResponse({}, 'software').then(function() {
                expect(wsmanInventoryJob.inventories).to.include('software');
                expect(loggerSpy).to.have.been.calledOnce;
            });
        });

        it('should handle the case that no catalog retrieved with retry.', function() {
            wsmanInventoryJob.retrys = [];
            wsmanInventoryJob.inventories = [];
            return wsmanInventoryJob.handleAsyncResponse({}, 'software').then(function() {
                expect(loggerSpy).to.have.been.calledOnce;
                expect(wsmanInventoryJob.inventories).to.not.include('software');
            });
        });

        it('should update existed inventory catalog', function() {
            mockWaterline.catalogs.findLatestCatalogOfSource.resolves(catalog);
            return wsmanInventoryJob.handleAsyncResponse(data, 'software').then(function() {
                expect(mockWaterline.catalogs.updateByIdentifier).to.have.been.calledOnce;
            });
        });

        it('should create new inventory catalog', function() {
            mockWaterline.catalogs.findLatestCatalogOfSource.resolves(undefined);
            return wsmanInventoryJob.handleAsyncResponse(data, 'nics').then(function() {
                expect(mockWaterline.catalogs.create).to.have.been.calledOnce;
            });
        });
    });

    describe('_handleAsyncRequest', function() {
        beforeEach(function() {
            WsmanInventoryJobClass.prototype._handleAsyncRequest.restore();
        });

        it('should end correctly while all inventories are collected', function() {
            wsmanInventoryJob.inventories = [];
            return wsmanInventoryJob._handleAsyncRequest().then(function() {
                expect(doneSpy).to.have.been.calledOnce;
            });
        });

        it('should send out request to collect inventory of compute type node correctly.', function() {
            wsmanInventoryJob.inventories = ['nics', 'manager'];
            wsmanInventoryJob.dellConfigs = dellConfigs;
            wsmanInventoryJob.nodeType = 'compute';
            wsmanInventoryJob.wsman = new wsmanTool(wsmanInventoryJob.dellConfigs.gateway, {
                verifySSL: false,
                recvTimeoutMs: 300000
            });
            wsmanTool.prototype.clientRequest.resolves({
                body: {
                    response: 'xxxxxx, Submitted: test, xxxxxx'
                }
            });
            return wsmanInventoryJob._handleAsyncRequest().then(function() {
                expect(wsmanTool.prototype.clientRequest).to.have.been.calledOnce;
                expect(loggerSpy).not.to.have.been.called;
            });
        });

        it('should handle the enclosure type node.', function() {
            wsmanInventoryJob.inventories = ['nics', 'manager'];
            wsmanInventoryJob.dellConfigs = dellConfigs;
            wsmanInventoryJob.nodeType = 'enclosure';
            wsmanInventoryJob.wsman = new wsmanTool(wsmanInventoryJob.dellConfigs.gateway, {
                verifySSL: false,
                recvTimeoutMs: 300000
            });
            wsmanTool.prototype.clientRequest.resolves({
                body: {
                    response: 'xxxxxx, Submitted: test, xxxxxx'
                }
            });
            return wsmanInventoryJob._handleAsyncRequest().then(function() {
                expect(wsmanTool.prototype.clientRequest).to.have.been.calledOnce;
                expect(loggerSpy).not.to.have.been.called;
            });
        });

        it('should handle the case that failed to collec inventory.', function() {
            wsmanInventoryJob.inventories = ['nics', 'manager'];
            wsmanInventoryJob.dellConfigs = dellConfigs;
            wsmanInventoryJob.nodeType = 'enclosure';
            wsmanInventoryJob.nodeId = '59c4720870bf1d7c172930db';
            wsmanInventoryJob.wsman = new wsmanTool(wsmanInventoryJob.dellConfigs.gateway, {
                verifySSL: false,
                recvTimeoutMs: 300000
            });
            wsmanTool.prototype.clientRequest.resolves({
                body: {
                    response: 'test'
                }
            });
            return wsmanInventoryJob._handleAsyncRequest().then(function() {
                expect(loggerSpy).to.calledWith("NICS inventory request failed for node: 59c4720870bf1d7c172930db");
            });
        });

        it('should handle the case error occurred while sending request.', function() {
            wsmanInventoryJob.inventories = ['nics', 'manager'];
            wsmanInventoryJob.dellConfigs = dellConfigs;
            wsmanInventoryJob.nodeType = 'enclosure';
            wsmanInventoryJob.nodeId = '59c4720870bf1d7c172930db';
            wsmanInventoryJob.wsman = new wsmanTool(wsmanInventoryJob.dellConfigs.gateway, {
                verifySSL: false,
                recvTimeoutMs: 300000
            });
            wsmanTool.prototype.clientRequest.rejects();
            return wsmanInventoryJob._handleAsyncRequest().then(function() {
                expect(loggerSpy).to.calledWith("Inventory request error for node: 59c4720870bf1d7c172930db");
            });
        });
    });
});
