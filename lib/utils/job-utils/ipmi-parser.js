// Copyright 2014-2015, Renasar Technologies Inc.
/* jshint bitwise: false */

// Javascript port of the ipmitool sensors parser from
// http://docs.openstack.org/developer/ironic/
//   _modules/ironic/drivers/modules/ipmitool.html

'use strict';

var di = require('di');

module.exports = parseSensorsDataFactory;
di.annotate(parseSensorsDataFactory, new di.Provide('JobUtils.IpmiCommandParser'));
di.annotate(parseSensorsDataFactory, new di.Inject('Assert', '_'));
function parseSensorsDataFactory(assert, _) {
    //UID status code, 0 = Off, 1 = Temporary On , 2 = On, 3 = reserved
    var uidStatus = ['Off', 'Temporary On', 'On', 'Reserved'];

    function parseSelInformationData(selData) {
        var lines = selData.trim().split('\n');
        lines.shift();
        return _.transform(lines, function(result, line) {
            var split = line.split(' : ');
            result[split.shift().trim()] = split.shift().trim();
        }, {});
    }

    function parseSelData(selData) {
        if (_.isEmpty(selData)) {
            return;
        }
        assert.string(selData);
        var lines = selData.trim().split('\n');
        var sel = [];
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
            sel.push(kv);
        }
        return sel;
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
     * parse/extract text output from IPMI call into raw data for the chassis status
     *
     * @param statusData
     * @returns {uid: 'Off|Temporary On|On|Reserved', power: true|false}
     */
    function parseChassisData(statusData) {
        // sample data : 20 00 60 71
        var numArr = statusData.replace(/\s/g, '').match(/[0-9a-fA-F]/g);
        assert.ok(numArr && numArr.length === 8, "Invalid chassis status output : " + statusData);
        var uidCode = parseInt(numArr[4], 16);
        var powerCode = parseInt(numArr[1], 16);
        // UID status need last 2 bit , so use mask 0x3(0011)
        // Power status need last bit , so use mask 0x1(0001)
        return {
            uid: uidStatus[uidCode & 0x3],
            power: (powerCode & 0x1) === 1
        };
    }

    return {
        parseSelInformationData: parseSelInformationData,
        parseSelData: parseSelData,
        parseSdrData: parseSdrData,
        parseChassisData: parseChassisData
    };
}
