// Copyright 2016, EMC, Inc.
/* jshint node: true */

'use strict';

describe(require('path').basename(__filename), function() {
    var schemaFileName = 'diag-update-spirom.json';

    var canonical = {
        imageName: 'somefirmware.bin',
        imageMode: 'bios',
        localImagePath: '/bios/bios.zip'
    };

    var positiveSetParam = {
        imageMode: ['bios', 'fullbios', 'me', 'post', 'uefi',
            'serdes', '0', '1', '2', '3', '4', '5']
    };

    var negativeSetParam = {
        imageName: 'somefirmware',
        imageMode: 'bmc',
        localImagePath: ['bios/bios.zip', '/bios/bios']
    };

    var positiveUnsetParam = [
        'localImagePath'
    ];

    var negativeUnsetParam = [
        'imageName',
        'imageMode'
    ];

    var SchemaUtHelper = require('./schema-ut-helper');
    new SchemaUtHelper(schemaFileName, canonical).batchTest(
        positiveSetParam, negativeSetParam, positiveUnsetParam, negativeUnsetParam);
});
