// Copyright 2016, EMC, Inc.
/* jshint node: true */

'use strict';

describe(require('path').basename(__filename), function() {
    var schemaFileName = 'provide-catalog-data.json';

    var canonical = {
        source: 'bmc',
        path: 'key1.key2.key3'
    };

    var negativeSetParam = {
        source: ['', null, 12],
        path: ['', null, 12]
    };

    var positiveSetParam = {
        source: ['a'],
        path: ['key1', 'k']
    };

    var negativeUnsetParam = [
        'source',
        'path'
    ];

    var positiveUnsetParam = [
    ];

    var SchemaUtHelper = require('./schema-ut-helper');
    new SchemaUtHelper(schemaFileName, canonical).batchTest(
        positiveSetParam, negativeSetParam, positiveUnsetParam, negativeUnsetParam);
});
