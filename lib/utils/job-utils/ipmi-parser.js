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
    /**
     * goes through the sensor data object returned by _processSensor
     * and returns a list of a single sensorType
     *
     * @param sensorDataObj
     * @returns {*}
     * @private
     */
    function _getSensorType(sensorDataObj) {
        var sensorTypes = ['Sensor Type (Analog)',
                           'Sensor Type (Discrete)',
                           'Sensor Type (Threshold)'];
        var sensorType = _.remove(sensorTypes, function(type) {
            try {
                return sensorDataObj[type].split(' ', 1)[0];
            } catch (e) {
                return false;
            }
        });

        if (_.isEmpty(sensorType)) {
            throw new Error("Unknown sensor type data: " + sensorDataObj);
        } else {
            return sensorType;
        }
    }

    /**
     * Parses through a block of text (newline delimited) and breaks
     * down the text into key/value pairs based on the line having a
     * ':' delimiter in it.
     *
     * @param sensorData
     * @returns {{}}
     * @private
     */
    function _processSensor(sensorData) {
        var sensorDataFields = sensorData.split('\n');
        var sensorDataObj = {};
        _.forEach(sensorDataFields, function(field) {
            if (_.isEmpty(field)) {
                return;
            }
            var fieldKv = field.split(':');
            if (fieldKv.length !== 2) {
                return;
            }
            sensorDataObj[fieldKv[0].trim()] = fieldKv[1].trim().replace(/'/g, '');
        });

        return sensorDataObj;
    }

    function parseSensorsData(sensorsData) {
        var sensorsDataArray = sensorsData.split('\n\n');
        var allSensorsData = {};
        if (!sensorsData) {
            return allSensorsData;
        }
        _.forEach(sensorsDataArray, function(sensorData) {
            var sensorDataObj = _processSensor(sensorData);

            if (_.isEmpty(sensorDataObj)) {
                return;
            }

            var sensorType = _getSensorType(sensorDataObj);

            // ignore the sensors which has no current 'Sensor Reading' data
            if (_.has(sensorDataObj, 'Sensor Reading')) {
                if (!_.has(allSensorsData, sensorType)) {
                    allSensorsData[sensorType] = {};
                }
                // remove any ' characters in the data
                var key = sensorDataObj['Sensor ID'].replace(/'/g, '');
                allSensorsData[sensorType][key] = sensorDataObj;
            }
        });

        if (_.isEmpty(allSensorsData)) {
            throw new Error("Invalid input for IPMI sensor data: " + sensorsData);
        }
        return allSensorsData;
    }

    function parseSelData(selData) {
        if (_.isEmpty(selData)) {
            return;
        }
        assert.string(selData);
        var lines = selData.split('\n');
        var selObj = {};
        if (lines[0].indexOf('SEL Entry') < 0)  {
            throw new Error("SEL Data does not include expected SEL Entry values at start.");
        }
        for (var i = 0; i < lines.length; i+=2) {
            if (lines[i].indexOf('SEL Entry') >= 0) {
                var selEntry = lines[i].match(/\w*$/);
                if (selEntry) {
                    var rows = lines[i+1].split(',');
                    assert.equal(rows.length, 6);
                    var kv = {
                        date: rows[1],
                        time: rows[2],
                        sensor: rows[3],
                        'event': rows[4],
                        value: rows[5]
                    };
                    selObj[selEntry] = kv;
                }
            }
        }
        return selObj;
    }

    // only for testing these internal functions
    parseSensorsData._processSensor = _processSensor;
    parseSensorsData._getSensorType = _getSensorType;

    return {
        parseSensorsData: parseSensorsData,
        parseSelData: parseSelData
    };
}
