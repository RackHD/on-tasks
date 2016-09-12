// Copyright 2016, EMC, Inc.
/* jshint node: true */

'use strict';

describe(require('path').basename(__filename), function() {
    var schemaFileName = 'wait-completion-uri.json';

    var canonical = {
        'completionUri': 'someUriPattern'
    };

    var negativeSetParam = {
        'completionUri': [null, '', 123]
    };

    var positiveSetParam = {
    };

    var negativeUnsetParam = [
        'completionUri'
    ];

    var positiveUnsetParam = [
    ];

    var SchemaUtHelper = require('./schema-ut-helper');
    new SchemaUtHelper(schemaFileName, canonical).batchTest(
        positiveSetParam, negativeSetParam, positiveUnsetParam, negativeUnsetParam);
});
