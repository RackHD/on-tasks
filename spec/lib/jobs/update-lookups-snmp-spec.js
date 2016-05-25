// Copyright 2016, EMC, Inc.

'use strict';
var uuid = require('node-uuid');

describe('update-lookups-job', function() {
    var waterline = { catalogs: {}, lookups: {} },
        UpdateLookupsJob,
        job,
        snmpObject;

    before(function() {
        helper.setupInjector([
            helper.require('/lib/jobs/base-job.js'),
            helper.require('/lib/jobs/update-lookups-snmp.js'),
            helper.di.simpleWrapper(waterline, 'Services.Waterline')
        ]);
        this.sandbox = sinon.sandbox.create();
        UpdateLookupsJob = helper.injector.get('Job.Snmp.Update.Lookups');
    });

    beforeEach(function() {
        snmpObject = {
            node: 'someNodeId',
            source: 'snmp-1',
            data: {
                "IF-MIB::ifDescr_1": "Ethernet1",
                "IF-MIB::ifDescr_2": "Ethernet2",
                "IF-MIB::ifDescr_999001": "Management1",
                "IF-MIB::ifType_1": "ethernetCsmacd",
                "IF-MIB::ifType_2": "ethernetCsmacd",
                "IF-MIB::ifType_999001": "ethernetCsmacd",
                "IF-MIB::ifSpeed_999001": "100000000",
                "IF-MIB::ifPhysAddress_1": "8:0:27:aa:c8:8e",
                "IF-MIB::ifPhysAddress_2": "8:0:27:ca:c6:a",
                "IF-MIB::ifPhysAddress_999001": "8:0:27:1e:27:4e"
            }
        };
        waterline.catalogs.findLatestCatalogOfSource = this.sandbox.stub().resolves(snmpObject);
        waterline.lookups.upsertNodeToMacAddress = this.sandbox.stub().resolves();
        job = new UpdateLookupsJob({}, { target: 'someNodeId'}, uuid.v4());
    });

    afterEach(function() {
        this.sandbox.restore();
    });

    it('should update lookups from cataloged snmp data', function() {
        return job._run()
        .then(function() {
            expect(waterline.lookups.upsertNodeToMacAddress).to.be.calledThrice;
            expect(waterline.lookups.upsertNodeToMacAddress).to.be
                .calledWithExactly('someNodeId', '08:00:27:aa:c8:8e');
            expect(waterline.lookups.upsertNodeToMacAddress).to.be
                .calledWithExactly('someNodeId', '08:00:27:ca:c6:0a');
            expect(waterline.lookups.upsertNodeToMacAddress).to.be
                .calledWithExactly('someNodeId', '08:00:27:1e:27:4e');
        });
    });

    it('should fail if lookups inserts fail', function() {
        var error = new Error('some Waterline error');
        waterline.lookups.upsertNodeToMacAddress.rejects(error);
        this.sandbox.stub(job, '_done').resolves();
        return job._run()
        .then(function() {
            expect(job._done.args[0][0]).to.deep.equal(error);
        });
    });

    it('should fail if snmp-1 data is unavailable', function() {
        waterline.catalogs.findLatestCatalogOfSource.resolves(undefined);
        this.sandbox.stub(job, '_done').resolves();
        return job._run()
        .then(function() {
            expect(job._done.args[0][0]).to.deep.equal(new Error('snmpData should be defined'));
        });
    });
});
