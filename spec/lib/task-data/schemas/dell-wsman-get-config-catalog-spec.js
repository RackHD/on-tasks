// Copyright 2017 Dell Inc. or its subsidiaries.  All Rights Reserved.
/* jshint node: true */

'use strict';

describe(require('path').basename(__filename), function() {
    var schemaFileName = 'dell-wsman-get-config-catalog.json';

    var canonical = {
        serverIP: "1.1.1.1",
        serverUsername: "root",
        serverPassword: "calvin",
        shareUsername: "adc",
        sharePassword: "adc",
        shareAddress: "10.10.10.10",
        shareType: 0,
        shareName: "emc",
        shutdownType: 0,
        fileName: "newconfig.xml",
        componentNames: ["LifecycleController.Embedded.1"]
    };

    var positiveSetParam = {
        shareUsername: ['emc', 'ullbios', 'root', 'post', 'uefi'],
        shareAddress: ['172.31.128.1', '192.168.129.3'],
        shareType: [0, 2],
        shareName: ["2333", "new folder", "d1///d2///d3"],
        shutdownType: [0, 1],
        fileName: ["myconfig.xml", "This config.xml"],
        componentNames: [["iDRAC.Embedded.1","LifecycleController.Embedded.1"],[]]
    };

    var negativeSetParam = {
        shareType: ['ftp', 3, '2', true],
        shutdownType: ['yes', '1', 'ture'],
        fileName: ["1.exe", "file"],
        componentNames: ["iDRAC",["iDRAC.Embedded.1", "iDRAC.Embedded.1"], 3]
    };

    var positiveUnsetParam = [
        'serverIP',
        'serverUsername',
        'serverPassword',
        'shareUsername',
        'sharePassword',
        'shareAddress',
        'shareType',
        'shareName',
        'fileName',
        'shutdownType',
        'componentNames'
    ];

    var negativeUnsetParam = [];

    var SchemaUtHelper = require('./schema-ut-helper');
    new SchemaUtHelper(schemaFileName, canonical).batchTest(
        positiveSetParam, negativeSetParam, positiveUnsetParam, negativeUnsetParam
    );
});
