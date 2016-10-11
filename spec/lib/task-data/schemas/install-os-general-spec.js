// Copyright 2016, EMC, Inc.
/* jshint node: true */

'use strict';

describe(require('path').basename(__filename), function() {
    var schemaFileName = 'install-os-general.json';

    var partialCanonical = {
        "users": [
            {
                "name": "rackhd1",
                "password": "123456",
                "uid": 1010,
                "sshKey": "ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQDJQ631/sw3D40h/6JfA+PFVy5Ofza6"
            },
            {
                "name": "rackhd2",
                "password": "123456",
            }
        ],
        "kvm": true,
        "installPartitions": [
            {
                "mountPoint": "/boot",
                "size": "500",
                "fsType": "ext3"
            },
            {
                "mountPoint": "swap",
                "size": "500",
            },
            {
                "mountPoint": "/",
                "size": "auto",
                "fsType": "ext3"
            }
        ]
    };

    var positiveSetParam = {
        "users[0].uid": [500, 10000, 65535]
    };

    var negativeSetParam = {
        kvm: [1, 'abc'],
        "users[0].uid": [0, 499, 65536],
    };

    var positiveUnsetParam = [
        "users",
        "kvm",
        "installPartitions",
        "users[0].sshKey",
        ["users[0].sshKey", "users[0].uid"]
    ];

    var negativeUnsetParam = [
        "users[0].name",
        "users[1].password"
    ];

    var installOsCommonHelper = require('./install-os-schema-ut-helper');
    var canonical = _.defaults(partialCanonical, installOsCommonHelper.canonical);
    installOsCommonHelper.test(schemaFileName, canonical);

    var SchemaUtHelper = require('./schema-ut-helper');
    new SchemaUtHelper(schemaFileName, canonical).batchTest(
        positiveSetParam, negativeSetParam, positiveUnsetParam, negativeUnsetParam);
});
