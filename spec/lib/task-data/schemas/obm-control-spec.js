// Copyright 2016, EMC, Inc.
/* jshint node: true */

'use strict';

describe(require('path').basename(__filename), function() {
    var schemaFilePath = '/lib/task-data/schemas/obm-control.json';

    var canonical = {
        "action": "powerOn",
        "obmService": "ipmi-obm-service"
    };

    var negativeSetParam = {
        "action": ['foo', 123, true],
        "obmService": ["not-existed-service", 9876]
    };

    var positiveSetParam = {
        action: [
            "clearSEL", "identifyOff", "identifyOn", "NMI", "powerButton", "powerOff",
            "powerOn", "powerStatus", "reboot", "setBootPxe"
        ],
        obmService: [
            "amt-obm-service", "apc-obm-service", "ipmi-obm-service", "noop-obm-service",
            "panduit-obm-service", "raritan-obm-service", "redfish-obm-service",
            "servertech-obm-service", "vbox-obm-service", "vmrun-obm-service"
        ]
    };

    var negativeUnsetParam = [
        "action",
        ["action", "obmService"]
    ];

    var positiveUnsetParam = [
        "obmService"
    ];

    var SchemaUtHelper = require('./schema-ut-helper');
    new SchemaUtHelper(schemaFilePath, canonical).batchTest(
        positiveSetParam, negativeSetParam, positiveUnsetParam, negativeUnsetParam);
});
