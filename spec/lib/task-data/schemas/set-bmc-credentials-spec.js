// Copyright 2016, EMC, Inc.
/* jshint node: true */

'use strict';

describe(require('path').basename(__filename), function() {
    var schemaFileName = 'set-bmc-credentials.json';

    var partialCanonical = {
        user: 'testipmi',
        password: 'myPassword'
    };

    var positiveSetParam = {
        user: ['a', '1122334455667788'],
        password: ['a', '11223344556677889900']
    };

    var positiveUnsetParam = [
    ];

    var negativeUnsetParam = [
        'user',
        'password'
    ];

    var commonHelper = require('./linux-command-schema-ut-helper');
    var canonical = _.defaults(partialCanonical, commonHelper.canonical);
    commonHelper.test(schemaFileName, canonical);

    var SchemaUtHelper = require('./schema-ut-helper');
    new SchemaUtHelper(schemaFileName, canonical).batchTest(
        positiveSetParam, positiveUnsetParam, negativeUnsetParam);
});
