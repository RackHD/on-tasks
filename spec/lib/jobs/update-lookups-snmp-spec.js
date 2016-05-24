// Copyright 2016, EMC, Inc.

'use strict';
var uuid = require('node-uuid');

describe('update-lookups-job', function() {
    var waterline = { catalogs: {}, lookups: {} },
        UpdateLookupsJob;

    before(function() {
        helper.setupInjector([
            helper.require('/lib/jobs/base-job.js'),
            helper.require('/lib/jobs/update-lookups-snmp.js'),
            helper.di.simpleWrapper(waterline, 'Services.Waterline')
        ]);

        UpdateLookupsJob = helper.injector.get('Job.Snmp.Update.Lookups');
    });

    it('should update lookups from cataloged snmp data', function() {
        var job = new UpdateLookupsJob({}, { target: 'someNodeId'}, uuid.v4());
        var snmpObject = {
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
        waterline.catalogs.findLatestCatalogOfSource = sinon.stub().resolves(snmpObject);
        waterline.lookups.upsertNodeToMacAddress = sinon.stub().resolves();
        return job._run()
        .then(function() {
            expect(waterline.lookups.upsertNodeToMacAddress).to.be.calledThrice;
            expect(waterline.lookups.upsertNodeToMacAddress).to.be
                .calledWithExactly('someNodeId', '08:00:27:ca:c6:0a');
        });
    });

});
