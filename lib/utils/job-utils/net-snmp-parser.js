// Copyright 2014-2015, Renasar Technologies Inc.
/* jshint node: true */

'use strict';

var di = require('di');

module.exports = parseSnmpDataFactory;
di.annotate(parseSnmpDataFactory, new di.Provide('JobUtils.SnmpParser'));
di.annotate(parseSnmpDataFactory, new di.Inject('_'));
function parseSnmpDataFactory(_) {
    /**
     * for parsing values like 'true(1)'
     * @param {String} data
     * @returns {number}
     */
    function parseNumInWord(data) {
        data = _.last(data.split(' '));
        return data.match(/\d+/)[0];
    }

    // for parsing non-number values like '"management1"'
    function parseStringValue(data) {
        return _.last(data.split(' ')).replace(/["']/g, '');
    }

    /**
     * Default parser for float values.
     * @param {String} data
     * @returns {number}
     */
    function defaultParseFloat(data) {
        var last = _.last(data.split(' '));
        return parseFloat(last);
    }

    var mibParserOverrides = {
        'LLDP-MIB::lldpLocPortId': parseStringValue,
        'IF-MIB::ifOperStatus': parseNumInWord,
        'IF-MIB::ifAdminStatus': parseNumInWord,
        'IF-MIB::ifConnectorPresent': parseNumInWord,
        'IF-MIB::ifPromiscuousMode': parseNumInWord,
        'IF-MIB::ifLinkUpDownTrapEnable': parseNumInWord,
        'IF-MIB::ifAlias': parseStringValue,
        'IF-MIB::ifName': parseStringValue,
        'IF-MIB::ifType': parseNumInWord,
        'IF-MIB::ifDescr': parseStringValue,
        'IF-MIB::ifSpecific': parseStringValue,
        'ENTITY-MIB::entPhysicalDescr': parseStringValue,
        'PDU-MIB::outletOperationalState': parseNumInWord,
        'PowerNet-MIB::sPDUOutletCtl': parseNumInWord,
        'IF-MIB::ifLastChange': function(data) {
            data = data.split(' ');
            var out = data[data.length-2];
            return out.match(/\d+/)[0];
        }
    };

    /**
     * Parse the SNMP data.
     * @param snmpData
     * @returns {{value: *, mibBaseType: *, oidSubTreeValue: *}}
     */
    function parseSnmpData(snmpData) {
        if (typeof snmpData !== 'string') {
            throw new Error("Data is not in string format");
        }

        var data = snmpData.trim(),
            mibType,
            mibBaseType,
            oidSubTreeValue,
            value;

        var errString = 'No Such Object available on this agent at this OID';
        if (data.indexOf(errString) >= 0) {
            throw new Error(data);
        }

        try {
            // Grab everything including the subtree, e.g.
            //   IF-MIB::ifHCInUcastPkts[999001] = Counter64: 0
            // will grab
            //   IF-MIB::ifHCInUcastPkts[999001]
            // since [999001] is the interface OID field here
            mibType = data.match(/^(.*?)\s/)[1];
            // Grab just the base without the sub-OID for parser lookup.
            mibBaseType = mibType.match(/^(.*?)[\.\[$]/)[1];
            // Grab any OID sub tree value appended to the MIB name
            oidSubTreeValue = data.match(/^.*?[\.\[](.*?)[\s\]]/);
            oidSubTreeValue = oidSubTreeValue ? oidSubTreeValue[1] : '';

            if (_.has(mibParserOverrides, mibBaseType)) {
                value = mibParserOverrides[mibBaseType](data);
            } else {
                value = defaultParseFloat(data);
            }
            if ((mibParserOverrides[mibBaseType] !== parseStringValue) &&
                isNaN(value)) {
                //noinspection ExceptionCaughtLocallyJS
              throw new Error("Expected SNMP value for " + mibType +
                                  " to be a number");
            }
        } catch (e) {
            // These are just regex match errors, so don't bother
            // logging them
            throw new Error("Unable to parse SNMP response " + data);
        }

        return {
            value: value,
            mibBaseType: mibBaseType,
            oidSubTreeValue: oidSubTreeValue
        };
    }

    return {
        parseSnmpData: parseSnmpData
    };
}
