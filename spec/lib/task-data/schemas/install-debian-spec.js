// Copyright 2017, Dell EMC, Inc.
/* jshint node: true */

'use strict';

describe(require('path').basename(__filename), function() {
    var schemaFileName = 'install-debian.json';

    var partialCanonical = {
        "baseUrl": "debian.baseUrl",
        "osName": "debian"	
    };

    var positiveSetParam = {
    };

    var negativeSetParam = {
    };

    var positiveUnsetParam = [
    ];

    var negativeUnsetParam = [
        "baseUrl",
        "hostname"
    ];

    var installOsCommonHelper = require('./install-os-schema-ut-helper');
    var canonical = _.defaults(partialCanonical, installOsCommonHelper.canonical);
    installOsCommonHelper.test(schemaFileName, canonical);

    var SchemaUtHelper = require('./schema-ut-helper');
    new SchemaUtHelper(schemaFileName, canonical).batchTest(
        positiveSetParam, negativeSetParam, positiveUnsetParam, negativeUnsetParam);
});
