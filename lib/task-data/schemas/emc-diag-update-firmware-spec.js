// Copyright 2017, Dell EMC, Inc.
/* jshint node: true */

'use strict';

describe(require('path').basename(__filename), function() {
    var schemaFileName = 'emc-diag-update-firmware.json';

    var canonical = {
        imageName: 'somefirmware.bin',
        imageMode: 'bios',
        firmwareType: 'spi',
        imageUrl: 'http://172.31.128.1:9080/somefirmware.bin',
        skipReset: true
    };

    var positiveSetParam = {
        imageMode: ['bios', 'fullbios', 'me', 'post', 'uefi',
            'serdes', '0', '1', '2', '3', '4', '5', 0, 1, 2, 3, 4, 5,
            "fullbmc", "bmcapp", "ssp", "bootblock", "adaptivecooling",
            "0x5f", "0x140", "0x142", "0x144", "0x145"
        ],
        skipReset: [true, false],
        imageUrl: ['172.31.128.1:9080/bios.bin', '192.168.129.3/fw_bmc.bin']
    };

    var negativeSetParam = {
        imageMode: ['bmc', 6, '6', true],
        firmwareType: ['post', 6, '6', true],
        skipReset: ['yes', 0, '1', 'ture'],
        imageUrl: ['172.31.133.1:8080/test.txt', '192.168.129.3/fw_bmc']
    };

    var positiveUnsetParam = [
        'skipReset'
    ];

    var negativeUnsetParam = [
        'imageUrl',
        'imageName',
        'firmwareType',
        'imageMode'
    ];

    var SchemaUtHelper = require('./schema-ut-helper');
    new SchemaUtHelper(schemaFileName, canonical).batchTest(
        positiveSetParam, negativeSetParam, positiveUnsetParam, negativeUnsetParam
    );
});
