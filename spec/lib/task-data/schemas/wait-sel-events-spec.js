// Copyright 2016, EMC, Inc.
/* jshint node: true */

'use strict';

describe(require('path').basename(__filename), function() {
    var schemaFileName = 'wait-sel-events.json';

    var canonical = {
        pollInterval: 10000,
        alertFilters: [{
            sensorNumber: '#0x4a',
            value: 'Asserted',
            sensorType: 'OEM',
            action: 'critical',
            count: 1
        }]
    };

    var positiveSetParam = {
        'pollInterval': 20000,
        alertFilters: [[
            {
                sensorNumber: '#0x4a',
                value: 'Asserted',
                sensorType: 'OEM',
                action: 'critical',
                count: 1
            },
            {
                sensorNumber: '#0x4b',
                value: 'Asserted',
                sensorType: 'OEM',
                action: 'critical',
                count: 1
            },
            {
                sensorNumber: '#0x4a',
                value: 'Asserted',
                sensorType: 'OEM',
                action: 'critical',
                count: 1
            }
        ]]
    };

    var negativeSetParam = {
        pollInterval: [20, 200000000],
        alertFilters: ['abc', []]
    };

    var positiveUnsetParam = [
        'pollInterval'
    ];

    var negativeUnsetParam = [
        'alertFilters'
    ];

    var SchemaUtHelper = require('./schema-ut-helper');
    new SchemaUtHelper(schemaFileName, canonical).batchTest(
        positiveSetParam, negativeSetParam, positiveUnsetParam, negativeUnsetParam);
});
