// Copyright 2016, EMC, Inc.
/* jshint node: true */

'use strict';

describe(require('path').basename(__filename), function() {
    var schemaFileName = 'delete-megaraid.json';

    var canonical = {
        deleteAll: false,
        path: '/opt/monorail/storcli',
        controller: 0,
        raidIds: [0, 1, 2, 128, 255]
    };

    var positiveSetParam = {
        deleteAll: true,
        controller: [1, 255],
        raidIds: [[]]
    };

    var negativeSetParam = {
        deleteAll: [0, null],
        path: ['', null, 123],
        controller: ['12', null, 'all'],
        raidIds: [[0, 1, 1]]
    };

    var positiveUnsetParam = [
        'deleteAll',
        'raidIds'
    ];

    var negativeUnsetParam = [
        'path',
        'controller',
        ['deleteAll', 'raidIds']
    ];

    var SchemaUtHelper = require('./schema-ut-helper');
    new SchemaUtHelper(schemaFileName, canonical).batchTest(
        positiveSetParam, negativeSetParam, positiveUnsetParam, negativeUnsetParam);
});
