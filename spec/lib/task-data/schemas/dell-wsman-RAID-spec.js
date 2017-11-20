// Copyright © 2017 Dell Inc. or its subsidiaries. All Rights Reserved.
/* jshint node: true */

'use strict';

describe(require('path').basename(__filename), function() {
    var schemaFileName = 'dell-wsman-RAID.json';

    var canonical = {
        shutdownType: 0,
        removeXmlFile: true
    };

    var positiveSetParam = {
        shutdownType: [0,1],
        removeXmlFile: [true, false]
    };

    var negativeSetParam = {
        shutdownType: [10, 20],
        removeXmlFile: ['true', 'false']
    };

    var positiveUnsetParam = [
        'shutdownType','removeXmlFile'
    ];

    var negativeUnsetParam = [
    ];

    var SchemaUtHelper = require('./schema-ut-helper');
    new SchemaUtHelper(schemaFileName, canonical).batchTest(
        positiveSetParam, negativeSetParam, positiveUnsetParam, negativeUnsetParam);
});
