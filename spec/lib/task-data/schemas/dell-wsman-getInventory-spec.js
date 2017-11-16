// Copyright © 2017 Dell Inc. or its subsidiaries. All  Rights Reserved.
/* jshint node: true */

'use strict';

describe(require('path').basename(__filename), function() {
    var schemaFileName = 'dell-wsman-getInventory.json';

    var canonical = {
        verifySSL: false,
        _taskTimeout: 5000,
        domain: 'domain'
    };

    var positiveSetParam = {
        verifySSL: [true, false],
        _taskTimeout: [1000, 9000],
        domain: ['domain', 'name']
    };

    var negativeSetParam = {
        verifySSL: ['true', null],
        _taskTimeout: [9000001, 90000012],
        domain: [false, null]

    };

    var positiveUnsetParam = [
        'verifySSL',
        '_taskTimeout',
        'domain'
    ];

    var negativeUnsetParam = [
    ];

    var SchemaUtHelper = require('./schema-ut-helper');
    new SchemaUtHelper(schemaFileName, canonical).batchTest(
        positiveSetParam, negativeSetParam, positiveUnsetParam, negativeUnsetParam);
});
