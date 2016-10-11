// Copyright 2016, EMC, Inc.
/* jshint node: true */

'use strict';

describe(require('path').basename(__filename), function() {
    var schemaFileName = 'catalog-raid.json';

    var partialCanonical = {
        adapter: 0
    };

    var positiveSetParam = {
        adapter: [1, 255, "0", "1", "255", "ALL"]
    };

    var negativeSetParam = {
        adapter: [-1, "-1", "all", "All", "abc"]
    };

    var positiveUnsetParam = [
    ];

    var negativeUnsetParam = [
        'adapter',
    ];

    var commonHelper = require('./linux-command-schema-ut-helper');
    var canonical = _.defaults(partialCanonical, commonHelper.canonical);
    commonHelper.test(schemaFileName, canonical);

    var SchemaUtHelper = require('./schema-ut-helper');
    new SchemaUtHelper(schemaFileName, canonical).batchTest(
        positiveSetParam, negativeSetParam, positiveUnsetParam, negativeUnsetParam);
});
