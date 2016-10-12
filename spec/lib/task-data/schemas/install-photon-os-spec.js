// Copyright 2016, EMC, Inc.
/* jshint node: true */

'use strict';

describe(require('path').basename(__filename), function() {
    var schemaFileName = 'install-photon-os.json';

    var partialCanonical = {
        "rackhdCallbackScript": "photon-os.rackhdcallback",
        "installType": "minimal"
    };

    var positiveSetParam = {
        "installType": ["minimal", "full"]
    };

    var negativeSetParam = {
        "installType": ["someOtherStuff", "mini", 1]
    };

    var positiveUnsetParam = [
    ];

    var negativeUnsetParam = [
        "rackhdCallbackScript",
        "installType"
    ];

    var installOsCommonHelper = require('./install-os-schema-ut-helper');
    var canonical = _.defaults(partialCanonical, installOsCommonHelper.canonical);
    installOsCommonHelper.test(schemaFileName, canonical);

    var SchemaUtHelper = require('./schema-ut-helper');
    new SchemaUtHelper(schemaFileName, canonical).batchTest(
        positiveSetParam, negativeSetParam, positiveUnsetParam, negativeUnsetParam);
});
