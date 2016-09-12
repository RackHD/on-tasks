// Copyright 2016, EMC, Inc.
/* jshint node: true */

'use strict';

describe(require('path').basename(__filename), function() {
    var schemaFileName = 'wait-notification.json';

    var canonical = {
    };

    var negativeSetParam = {
    };

    var positiveSetParam = {
    };

    var negativeUnsetParam = [
    ];

    var positiveUnsetParam = [
    ];

    var SchemaUtHelper = require('./schema-ut-helper');
    new SchemaUtHelper(schemaFileName, canonical).batchTest(
        positiveSetParam, negativeSetParam, positiveUnsetParam, negativeUnsetParam);
});
