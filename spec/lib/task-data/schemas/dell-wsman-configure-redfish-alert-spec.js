// Copyright 2017, Dell EMC, Inc.
/* jshint node: true */

'use strict';

describe(require('path').basename(__filename), function() {
    var schemaFileName = 'dell-wsman-configure-redfish-alert.json';

    var canonical = {
        shutdownType: 0,
        forceUpdate: true
    };

    var positiveSetParam = {
        shutdownType: [0, 1],
        forceUpdate: [true, false]
    };

    var negativeSetParam = {
        shutdownType: [2, -1, "0", "1"],
        forceUpdate: ["true", "false"]
    };

    var positiveUnsetParam = [
    ];

    var negativeUnsetParam = [
        'shutdownType',
        'forceUpdate'
    ];

    var SchemaUtHelper = require('./schema-ut-helper');
    new SchemaUtHelper(schemaFileName, canonical).batchTest(
        positiveSetParam, negativeSetParam, positiveUnsetParam, negativeUnsetParam
    );
});
