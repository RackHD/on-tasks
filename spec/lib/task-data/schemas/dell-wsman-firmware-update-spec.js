// Copyright 2017 Dell Inc. or its subsidiaries.  All Rights Reserved.
/* jshint node: true */

'use strict';

describe(require('path').basename(__filename), function() {
    var schemaFileName = 'dell-wsman-firmware-update.json';

    var canonical = {
        shareFolderUserName: "adc",
        shareFolderPassword: "adc",
        shareFolderAddress: "10.10.10.10",
        shareFolderType: "NFS",
        shareFolderName: "emc",
        rebootNeeded: true
    };

    var positiveSetParam = {
        shareFolderUserName: ['emc', 'ullbios', 'root', 'post', 'uefi'],
        rebootNeeded: [true, false],
        shareFolderAddress: ['172.31.128.1', '192.168.129.3'],
        shareFolderType: ["NFS", "CIFS", "nfs", "cifs"],
    };

    var negativeSetParam = {
        shareFolderType: ['ftp', 3, '2', true],
        rebootNeeded: ['yes', 0, '1', 'ture']
    };

    var positiveUnsetParam = [
        'rebootNeeded',
        'shareFolderUserName',
        'shareFolderPassword'
    ];

    var negativeUnsetParam = [
        'shareFolderAddress',
        'shareFolderName',
        'shareFolderType'
    ];

    var SchemaUtHelper = require('./schema-ut-helper');
    new SchemaUtHelper(schemaFileName, canonical).batchTest(
        positiveSetParam, negativeSetParam, positiveUnsetParam, negativeUnsetParam
    );
});
