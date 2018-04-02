// Copyright © 2018 Dell Inc. or its subsidiaries. All Rights Reserved.

'use strict';
var uuid = require('node-uuid');

describe('wsman-update-lookups-job', function() {
    var wsmanBmcCatalog = {
            id: 'CatalogsId',
            source: 'manager',
            data: {
                "DCIM_IDRACCardView": {
                    "DeviceDescription": "iDRAC",
                    "LANEnabledState": "1",
                    "PermanentMACAddress": "18:66:da:52:2c:9c",
                    "FQDD": "iDRAC.Embedded.1-1",
                    "DNSRacName": "idrac-ABCD123"
                }
            }
        };
    var wsmanNicCatalog = {
           source: 'nics',
           data: [{
               name: 'nic1',
               currentMACAddress: "18:66:da:52:2c:c2"
           },
           {
               name: 'nic2',
               currentMACAddress: '18:66:da:52:2c:c3'
           },
           {
               name: 'nic3',
               currentMACAddress: "18:66:da:52:2c:c4"
           }]
        };

    var waterline = { catalogs: {}, lookups: {} },
        UpdateWsmanLookupsJob,
        job,
        wsmanCatalog;

    before(function() {
        helper.setupInjector([
            helper.require('/lib/jobs/base-job.js'),
            helper.require('/lib/jobs/dell-wsman-update-lookups.js'),
            helper.di.simpleWrapper(waterline, 'Services.Waterline')
        ]);
        this.sandbox = sinon.sandbox.create();
        UpdateWsmanLookupsJob = helper.injector.get('Job.Wsman.Update.Lookups');
    });

    beforeEach(function() {
        waterline.catalogs.findLatestCatalogOfSource = this.sandbox.stub();
        waterline.lookups.upsertNodeToMacAddress = this.sandbox.stub();
        job = new UpdateWsmanLookupsJob({}, { target: 'someNodeId'}, uuid.v4());
        this.sandbox.restore();
    });

    afterEach(function() {
        this.sandbox.restore();
    });

    it('should update lookups from inventory catalog', function() {
        waterline.catalogs.findLatestCatalogOfSource.withArgs('someNodeId', 'manager').resolves(wsmanBmcCatalog);
        waterline.catalogs.findLatestCatalogOfSource.withArgs('someNodeId', 'nics').resolves(wsmanNicCatalog);
        return job._run()
        .then(function() {
            expect(waterline.lookups.upsertNodeToMacAddress).to.be.called;
            expect(waterline.lookups.upsertNodeToMacAddress).to.be
                .calledWith('someNodeId', '18:66:da:52:2c:9c');
            expect(waterline.lookups.upsertNodeToMacAddress).to.be
                .calledWith('someNodeId', '18:66:da:52:2c:c2');
            expect(waterline.lookups.upsertNodeToMacAddress).to.be
                .calledWith('someNodeId', '18:66:da:52:2c:c3');
            expect(waterline.lookups.upsertNodeToMacAddress).to.be
                .calledWith('someNodeId', '18:66:da:52:2c:c4');
        });
    });

    it('should fail if lookups inserts fail', function() {
        var error = new Error('some Waterline error');
        waterline.lookups.upsertNodeToMacAddress.rejects(error);
        waterline.catalogs.findLatestCatalogOfSource.withArgs('someNodeId', 'manager').resolves(wsmanBmcCatalog);
        waterline.catalogs.findLatestCatalogOfSource.withArgs('someNodeId', 'nics').resolves(wsmanNicCatalog);
        this.sandbox.stub(job, '_done').resolves();
        return job._run()
        .then(function() {
            expect(job._done.args[0][0]).to.deep.equal(error);
        });
    });

    it('should fail if manager data is unavailable in catalog', function() {
        waterline.catalogs.findLatestCatalogOfSource.resolves(undefined);
        this.sandbox.stub(job, '_done').resolves();
        return job._run()
        .then(function() {
            expect(job._done.args[0][0]).to.deep.equal(new Error('Could not find management mac in SMI inventory!'));
        });
    });

    it('should fail if nic data is unavailable in catalog', function() {
        waterline.catalogs.findLatestCatalogOfSource.withArgs('someNodeId', 'manager').resolves(wsmanBmcCatalog);
        waterline.catalogs.findLatestCatalogOfSource.withArgs('someNodeId', 'nics').resolves(undefined);
        this.sandbox.stub(job, '_done').resolves();
        return job._run()
        .then(function() {
            expect(job._done.args[0][0]).to.deep.equal(new Error('Could not find nic mac in SMI inventory!'));
        });
    });
});
