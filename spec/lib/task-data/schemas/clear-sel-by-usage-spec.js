// Copyright 2016, EMC, Inc.
/* jshint node: true */

'use strict';

describe(require('path').basename(__filename), function() {
    var schemaFileName = 'clear-sel-by-usage.json';

    var canonical = {
        selClear: true,
        maxSelUsage: 80
    };

    var positiveSetParam = {
    };

    var negativeSetParam = {
        selClear: ['', null, 123],
        maxSelUsage:  ['', null, 123, true]
    };

    var positiveUnsetParam = [
        'selClear',
        'maxSelUsage'
    ];

    var negativeUnsetParam = [
    ];

    var SchemaUtHelper = require('./schema-ut-helper');
    new SchemaUtHelper(schemaFileName, canonical).batchTest(
        positiveSetParam, negativeSetParam, positiveUnsetParam, negativeUnsetParam);
});
