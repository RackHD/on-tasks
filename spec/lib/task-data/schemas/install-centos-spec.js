// Copyright 2016, EMC, Inc.
/* jshint node: true */

'use strict';

describe(require('path').basename(__filename), function() {
    var schemaFileName = 'install-centos.json';

    var partialCanonical = {
        "rackhdCallbackScript": "centos.rackhdcallback",
        "progressMilestones": {
            "m1": { value: 1, description: "do task 1" },
            "m2": { value: 2, description: "do task 2" }
        }
    };

    var positiveSetParam = {
    };

    var negativeSetParam = {
        "progressMilestones.m1.value": ["1", -1]
    };

    var positiveUnsetParam = [
        "progressMilestones",
        "progressMilestones.m1.description"
    ];

    var negativeUnsetParam = [
        "rackhdCallbackScript",
        "hostname",
        "progressMilestones.m1.value"
    ];

    var installOsCommonHelper = require('./install-os-schema-ut-helper');
    var canonical = _.defaults(partialCanonical, installOsCommonHelper.canonical);
    installOsCommonHelper.test(schemaFileName, canonical);

    var SchemaUtHelper = require('./schema-ut-helper');
    new SchemaUtHelper(schemaFileName, canonical).batchTest(
        positiveSetParam, negativeSetParam, positiveUnsetParam, negativeUnsetParam);
});
