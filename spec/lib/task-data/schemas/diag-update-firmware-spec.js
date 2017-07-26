// Copyright 2017, EMC, Inc.
/* jshint node: true */

'use strict';

describe(require('path').basename(__filename), function() {
    var schemaFileName = 'diag-update-firmware.json';

    var canonical = {
        imageName: 'somefirmware.bin',
        imageMode: 'bios',
        firmwareName: 'bios',
        localImagePath: '/bios/bios.zip'
    };

    var positiveSetParam = {
        imageMode: ['bios', 'fullbios', 'me', 'post', 'uefi',
            'serdes', '0', '1', '2', '3', '4', '5', 0, 1, 2, 3, 4, 5,
            "fullbmc", "bmcapp", "ssp", "bootblock", "adaptivecooling",
            "0x5f", "0x140", "0x142", "0x144", "0x145"
        ]
    };

    var negativeSetParam = {
        imageName: 'somefirmware',
        imageMode: ['bmc', 6, '6', true],
        firmwareName: ['post', 6, '6', true],
        localImagePath: ['bios/bios.zip', '/bios/bios']
    };

    var positiveUnsetParam = [
        'localImagePath'
    ];

    var negativeUnsetParam = [
        'imageName',
        'firmwareName',
        'imageMode'
    ];

    var SchemaUtHelper = require('./schema-ut-helper');
    new SchemaUtHelper(schemaFileName, canonical).batchTest(
        positiveSetParam, negativeSetParam, positiveUnsetParam, negativeUnsetParam
    );
});
