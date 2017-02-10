// Copyright 2016, EMC, Inc.
/* jshint node: true */

'use strict';

describe(require('path').basename(__filename), function() {
    var schemaFileName = 'common-task-options.json';

    var canonical = {
        _taskTimeout: 1000,
        schedulerOverrides: {
            timeout: 2000
        }
    };

    var negativeSetParam = {
        "_taskTimeout": [-2, 1.5, '100', null],
        "schedulerOverrides.timeout": [-2, 1.5, '100', null]
    };

    var positiveSetParam = {
        "_taskTimeout": [36000, 0, -1],
        "schedulerOverrides.timeout": [36000, 0, -1],
    };

    var negativeUnsetParam = [
    ];

    var positiveUnsetParam = [
        '_taskTimeout',
        'schedulerOverrides',
        'schedulerOverrides.timeout'
    ];

    var SchemaUtHelper = require('./schema-ut-helper');
    new SchemaUtHelper(schemaFileName, canonical).batchTest(
        positiveSetParam, negativeSetParam, positiveUnsetParam, negativeUnsetParam);
});
