// Copyright 2015, Renasar Technologies Inc.
/* jshint node: true */

'use strict';

describe("SNMP parser", function () {
    var snmpData;
    var parser;

    before('SNMP parser before', function () {
        snmpData = require('./stdout-helper').snmp;
        // create a child injector with on-core and the base pieces we need to test this
        helper.setupInjector([
            helper.require('/lib/utils/job-utils/net-snmp-parser.js')
        ]);

        parser = helper.injector.get('JobUtils.SnmpParser');
    });

    it("should parse snmp output data", function () {
        var output = parser.parseSnmpData(snmpData);
        expect(output).to.have.length(83);
        expect(_.find(output, { oid: 'LLDP-MIB::lldpMessageTxInterval.0' })).to.deep.equal({
            oid: 'LLDP-MIB::lldpMessageTxInterval.0',
            value: '30 seconds' }
        );
    });
});


