// Copyright 2016, EMC, Inc.
/* jshint node: true */

'use strict';

describe(require('path').basename(__filename), function() {
    var schemaFileName = 'install-coreos.json';

    var canonical = {
        "profile": "install-coreos.ipxe",
        "installScript": "install-coreos.sh",
        "installScriptUri": "http://172.31.128.9090/api/current/templates/install-coreos.sh",
        "version": "current",
        "repo": "http://172.31.128.1:9080/coreos/current",
        "hostname": "rackhd-node",
        "installDisk": "/dev/sda",
        "comport": "ttyS0",
        "osType": "linux",
        "rootPassword": "RackHD",
        "ignitionScriptUri": "http://172.31.128.9090/api/current/templates/ignition.json"
    };

    var positiveSetParam = {
        "installDisk": ["/dev/sdb", "sda", 0, 1, null]
    };

    var negativeSetParam = {
        "repo": ["foo", 123],
        "version": 1.9,
    };

    var positiveUnsetParam = [
        "installDisk"
    ];

    var negativeUnsetParam = [
        "osType",
        "profile",
        "installScript",
        "installScriptUri",
        "version",
        "repo",
        "hostname",
        "comport",
        "ignitionScriptUri"
    ];

    var SchemaUtHelper = require('./schema-ut-helper');
    new SchemaUtHelper(schemaFileName, canonical).batchTest(
        positiveSetParam, negativeSetParam, positiveUnsetParam, negativeUnsetParam);
});
