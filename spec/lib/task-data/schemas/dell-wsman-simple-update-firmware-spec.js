// Copyright 2017 Dell Inc. or its subsidiaries.  All Rights Reserved.
/* jshint node: true */

'use strict';

describe(require('path').basename(__filename), function() {
    var schemaFileName = 'dell-wsman-simple-update-firmware.json';

    var canonical = {
        imageURI: 'http://1.1.1.1:8080/common/BIOS.exe'
    };

    var positiveSetParam = {
        imageURI: [
            'http://1.1.1.1:8080/common/BIOS.exe',
            'https://1.1.1.1:8080/common/BIOS.exe'
        ]
    };

    var negativeSetParam = {
        imageURI: [
            [ 'test' ],
            123
        ]
    };

    var positiveUnsetParam = [];

    var negativeUnsetParam = [
        'imageURI'
    ];

    var SchemaUTHelper = require('./schema-ut-helper');
    new SchemaUTHelper(schemaFileName, canonical).batchTest(
        positiveSetParam, negativeSetParam, positiveUnsetParam, negativeUnsetParam
    );
});
