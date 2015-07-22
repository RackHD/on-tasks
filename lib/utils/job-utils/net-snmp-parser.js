// Copyright 2014-2015, Renasar Technologies Inc.
/* jshint node: true */

'use strict';

var di = require('di');

module.exports = parseSnmpDataFactory;
di.annotate(parseSnmpDataFactory, new di.Provide('JobUtils.SnmpParser'));
function parseSnmpDataFactory() {
    /**
     * Parse the SNMP data.
     * @param snmpData
     * @returns {{value: *, oid: *}}
     */
    function parseSnmpData(snmpData) {
        if (typeof snmpData !== 'string') {
            throw new Error("Data is not in string format");
        }

        var data = snmpData.trim();
        var errString = 'No Such Object available on this agent at this OID';

        if (data.indexOf(errString) >= 0) {
            throw new Error(data);
        }

        var parsed = data.split(' ');

        return {
            oid: parsed.shift(),
            value: parsed.join(' ')
        };
    }

    return {
        parseSnmpData: parseSnmpData
    };
}
