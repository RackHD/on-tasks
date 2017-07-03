// Copyright 2016, EMC, Inc.
/* jshint node: true */

'use strict';

describe(require('path').basename(__filename), function() {
    var schemaFileName = 'dell-racadm-control.json';

    var partialCanonical = {
        serverUsername: "abc",
        serverPassword: "abc",
        forceReboot: false,
        serverFilePath: "/home/onrack/bios.exe",
        action: 'setBiosConfig'
    };

    var positiveSetParam = {
        serverUsername: ["1", "a"],
        serverPassword: ["ab", "+++_"],
        forceReboot: [false, true],
        serverFilePath: 
            ["/home/onrack/bios.exe", "/home/onrack/bmc.d7", 
                "\\\\share\\image\\bios.exe", "10.1.1.1:/ifs/rackhd/r730.xml"],
        action: [
            "setBiosConfig", "updateFirmware", "getBiosConfig",
            "getConfigCatalog", "enableIpmi", "disableIpmi",
            "disableVTx", "enableVTx"
        ]
    };

    var negativeSetParam = {
        serverUsername: 123123,
        serverPassword: false,
        forceReboot: ["false", 123, null],
        serverFilePath: ["/home/onrack/bios", "home/onrack/bios.exe"],
        action: 'anything'
    };

    var positiveUnsetParam = [
        "serverUsername",
        "forceReboot",
        ["serverPassword", "serverUsername"],
    ];

    var negativeUnsetParam = [
        "action"
    ];

    //var commonHelper = require('./linux-command-schema-ut-helper');
    //var canonical = _.defaults(partialCanonical, commonHelper.canonical);
    //commonHelper.test(schemaFileName, canonical);

    var SchemaUtHelper = require('./schema-ut-helper');
    new SchemaUtHelper(schemaFileName, partialCanonical).batchTest(
        positiveSetParam, negativeSetParam, positiveUnsetParam, negativeUnsetParam);
});
