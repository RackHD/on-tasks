// Copyright © 2017 Dell Inc. or its subsidiaries. All  Rights Reserved.
/* jshint node: true */

'use strict';

describe(require('path').basename(__filename), function() {
    var schemaFileName = 'dell-wsman-getInventory.json';

    var canonical = {
        verifySSL: false,
        domain: 'domain'
    };

    var positiveSetParam = {
        verifySSL: [true, false],
        domain: ['domain', 'name']
    };

    var negativeSetParam = {
        verifySSL: ['true', null],
        domain: [false, null]

    };

    var positiveUnsetParam = [
        'verifySSL',
        'domain'
    ];

    var negativeUnsetParam = [
    ];

    var SchemaUtHelper = require('./schema-ut-helper');
    new SchemaUtHelper(schemaFileName, canonical).batchTest(
        positiveSetParam, negativeSetParam, positiveUnsetParam, negativeUnsetParam);
});
