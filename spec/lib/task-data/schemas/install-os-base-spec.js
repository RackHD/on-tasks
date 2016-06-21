/* jshint node: true */
// Copyright 2016, EMC, Inc.

'use strict';

describe(require('path').basename(__filename), function() {
    var schemaFilePath = '/lib/task-data/schemas/install-centos.json';

    var particalCanonical = {
        "rackhdCallbackScript": "centos.rackhdcallback",
    };

    var positiveSetParam = {
        "rackhdCallbackScript": "foo"
    };

    var negativeSetParam = {
        "rackhdCallbackScript": ""
    };

    var positiveUnsetParam = [
    ];

    var negativeUnsetParam = [
        "rackhdCallbackScript"
    ];

    var installOsCommonHelper = require('./install-os-schema-ut-helper');
    var canonical = _.defaults(particalCanonical, installOsCommonHelper.canonical);
    installOsCommonHelper.test(schemaFilePath, canonical);

    var SchemaUtHelper = require('./schema-ut-helper');
    new SchemaUtHelper(schemaFilePath, canonical).batchTest(
        positiveSetParam, negativeSetParam, positiveUnsetParam, negativeUnsetParam);
});
