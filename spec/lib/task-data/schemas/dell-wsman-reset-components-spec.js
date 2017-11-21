// Copyright 2017, Dell EMC, Inc.
/* jshint node: true */

'use strict';

describe(require('path').basename(__filename), function() {
    var schemaFileName = 'dell-wsman-reset-components.json';

    var canonical = {
        components: ["bios", "idrac"]
    };

    var positiveSetParam = {
        components: [
            ["bios"],
            ["bios", "diag", "drvpack", "idrac", "lcdata"]
        ]
    };

    var negativeSetParam = {
        components: [["bios", "bios"], [], ["Bios"], ["Non-Component"]]
    };

    var positiveUnsetParam = [
    ];

    var negativeUnsetParam = [
        'components'
    ];

    var SchemaUtHelper = require('./schema-ut-helper');
    new SchemaUtHelper(schemaFileName, canonical).batchTest(
        positiveSetParam, negativeSetParam, positiveUnsetParam, negativeUnsetParam
    );
});
