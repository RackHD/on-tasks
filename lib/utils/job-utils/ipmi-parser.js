// Copyright 2014-2015, Renasar Technologies Inc.
/* jshint node: true */

// Javascript port of the ipmitool sensors parser from
// http://docs.openstack.org/developer/ironic/
//   _modules/ironic/drivers/modules/ipmitool.html

'use strict';

var di = require('di');

module.exports = parseSensorsDataFactory;
di.annotate(parseSensorsDataFactory, new di.Provide('JobUtils.IpmiCommandParser'));
di.annotate(parseSensorsDataFactory, new di.Inject('Assert', '_'));
function parseSensorsDataFactory(assert, _) {
    function parseSelInformationData(selData) {
        var lines = selData.stdout.trim().split('\n');
        lines.shift();
        return _.transform(lines, function(result, line) {
            var split = line.split(' : ');
            result[split.shift().trim()] = split.shift().trim();
        }, {});
    }

    function parseSelListData(selData) {
        if (_.isEmpty(selData)) {
            return;
        }
        assert.string(selData);
        var lines = selData.trim().split('\n');
        var selList = [];
        for (var i = 0; i < lines.length; i+=1) {
            if (lines[i].indexOf('SEL Entry') >= 0) {
                continue;
            }
            var rows = lines[i].split(',');
            if (rows.length !== 6) {
                continue;
            }
            var sensorInfo = rows[3].split(' ');
            var kv = {
                logId: rows[0],
                date: rows[1],
                time: rows[2],
                sensorType: sensorInfo.slice(0, -1).join(' '),
                sensorNumber: sensorInfo[sensorInfo.length-1],
                'event': rows[4],
                value: rows[5]
            };
            selList.push(kv);
        }
        return selList;
    }

    /**
     * parse/extract text output from IPMI call into key/value data for the SDR
     * information
     *
     * @param sdrData
     * @returns {*}
     */
    function parseSdrData(sdrData) {
        // ignore null columns
        var columnsLongFormat = [
            "Sensor Id",
            "Sensor Reading",
            "Sensor Reading Units",
            "Status",
            "Entity Id",
            "Entry Id Name",
            "Sensor Type",
            "Nominal Reading",
            "Normal Minimum",
            "Normal Maximum",
            null,
            "Upper critical",
            "Upper non-critical",
            null,
            "Lower critical",
            "Lower non-critical",
            null,
            null
        ];
        var columnsShortFormat = [
            "Sensor Id",
            null,
            "Status",
            "Entity Id",
            "States Asserted"
        ];
        return _.compact(_.map(sdrData.split('\n'), function(line) {
            var rows = line.split(',');
            var parsed = _.transform(rows, function(result, v, k) {
                if (rows.length === 18) {
                    if (columnsLongFormat[k]) {
                        result[columnsLongFormat[k]] = v;
                    }
                } else if (rows.length === 5) {
                    if (columnsShortFormat[k]) {
                        result[columnsShortFormat[k]] = v;
                    }
                }
            }, {});
            return _.isEmpty(parsed) ? null : parsed;
        }));
    }

    /**
     * parse/extract text output from IPMI call into raw data for the uid LED
     * information
     *
     * @param statusData
     * @returns 0 = Off, 1 = Temporary On , 2 = On, 3 = reserved, -1 = unknown
     */
    function parseUidData(statusData) {
        assert.string(statusData);
        // sample data : 20 00 60 71
        var expValidateData = statusData.trim().length != 11 || statusData.trim().split(' ').length != 4
        var uidState = parseInt(statusData.trim().charAt(6), 16)
        // Only care about last 2 bit , so use mask 0x3(0011) to get last 2 bit
        // 00 = Off, 01 = Temporary On , 10 = On, 11 = reserved
        return (expValidateData || uidState == NaN) ? -1 : uidState & 0x3
    }

    return {
        parseSelInformationData: parseSelInformationData,
        parseSelListData: parseSelListData,
        parseSdrData: parseSdrData,
        parseUidData: parseUidData
    };
}
