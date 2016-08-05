// Copyright 2016, EMC, Inc.
/* jshint node: true */

'use strict';

describe(require('path').basename(__filename), function() {
    var schemaFileName = 'condition.json';

    var canonical = {
        "when": "someValue"
    };

    var negativeSetParam = {
        "when": [true, false, 1, 0]
    };

    var positiveSetParam = {
        "when": ["true", "false", "1", "0", "abc", ""]
    };

    var negativeUnsetParam = [
        "when"
    ];

    var positiveUnsetParam = [
    ];

    var SchemaUtHelper = require('./schema-ut-helper');
    new SchemaUtHelper(schemaFileName, canonical).batchTest(
        positiveSetParam, negativeSetParam, positiveUnsetParam, negativeUnsetParam);
});
