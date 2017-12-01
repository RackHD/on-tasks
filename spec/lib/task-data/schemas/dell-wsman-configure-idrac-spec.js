// Copyright 2017, Dell EMC, Inc.
/* jshint node: true */

'use strict';

describe(require('path').basename(__filename), function() {
    var schemaFileName = 'dell-wsman-configure-idrac.json';

    var canonical = {
        gateway: "192.168.128.1",
        netmask: "192.168.128.255",
        address: "192.168.128.3"
    };

    var positiveSetParam = {
        gateway: ["192.168.133.1"],
        netmask: ["192.168.133.255"],
        address: ["192.168.133.3"]
    };

    var negativeSetParam = {
        gateway: ["192.168.133.", "192.168.300.1"],
        netmask: ["192.168.133.", "192.168.300.255"],
        address: ["192.168.133.", "192.168.300.3"]
    };

    var positiveUnsetParam = [
    ];

    var negativeUnsetParam = [
        'gateway',
        'netmask',
        'address'
    ];

    var SchemaUtHelper = require('./schema-ut-helper');
    new SchemaUtHelper(schemaFileName, canonical).batchTest(
        positiveSetParam, negativeSetParam, positiveUnsetParam, negativeUnsetParam
    );
});
