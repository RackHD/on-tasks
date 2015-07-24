// Copyright 2014-2015, Renasar Technologies Inc.
/* jshint node: true */

'use strict';

var di = require('di');

module.exports = parseSnmpDataFactory;
di.annotate(parseSnmpDataFactory, new di.Provide('JobUtils.SnmpParser'));
di.annotate(parseSnmpDataFactory, new di.Inject(
    '_'
));
function parseSnmpDataFactory(_) {
    /**
     * Parse a line of output from SNMP data
     * @param line
     * @returns {{value: *, oid: *}}
     */
    function parseSnmpLine(line) {
        if (typeof line !== 'string') {
            throw new Error("Data is not in string format");
        }

        var data = line.trim();
        var errString = 'No Such Object available on this agent at this OID';

        if (data.indexOf(errString) >= 0) {
            throw new Error(data);
        }

        // Messages that occur as a result of doing MIB translation on output
        // We exclude "Cannot find module" and "Did not find *" messages because
        // in some cases we walk the whole tree and there are may be vendor-specific
        // mibs that we don't have installed.
        if (data.indexOf('MIB search path') >= 0 ||
            data.indexOf('Cannot find module') >= 0 ||
            data.indexOf('Did not find') >= 0) {

            return;
        }

        var parsed = data.split(' ');

        return {
            oid: parsed.shift(),
            value: parsed.join(' ')
        };
    }

    /**
     * Parse the SNMP data.
     * @param snmpData
     * @returns [*]
     */
    function parseSnmpData(snmpData) {
        var lines = snmpData.trim().split('\n');
        return _.compact(_.map(lines, function(line) {
            return parseSnmpLine(line);
        }));
    }

    return {
        parseSnmpData: parseSnmpData
    };
}
