// Copyright 2016, EMC, Inc.
/* jshint node: true */

'use strict';

describe(require('path').basename(__filename), function() {
    var schemaFilePath = '/lib/task-data/schemas/install-esxi-schema.json';

    var canonical = {
        "osType": "esx",
        "version": "5.5",
        "repo": "http://172.31.128.1:9080/esxi/5.5",
        "rootPassword": "RackHDRocks!",
        "hostname": "rackhd-node",
        "domain": "example.com",
        "users": [
            {
                "name": "rackhd1",
                "password": "123456",
                "sshKey": "ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQDJQ631/sw3D40h/6JfA+PFVy5Ofza6"
            },
            {
                "name": "rackhd2",
                "password": "123456",
            }
        ],
        "rootSshKey": "ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQDJQ631/sw3D40h/6JfA+PFVy5Ofz6eu7ca",
        "dnsServers": [
            "172.12.88.91",
            "192.168.20.77"
        ],
        "networkDevices": [
            {
                "device": "vmnic0",
                "ipv4": {
                    "ipAddr": "192.168.1.29",
                    "gateway": "192.168.1.1",
                    "netmask": "255.255.255.0",
                    "vlanIds": [
                        104,
                        105
                    ]
                },
                "ipv6": {
                    "ipAddr": "fec0::6ab4:0:5efe:157.60.14.21",
                    "gateway": "fe80::5efe:131.107.25.1",
                    "netmask": "ffff.ffff.ffff.ffff.0.0.0.0",
                    "vlanIds": [
                        101,
                        106
                    ]
                }
            },
            {
                "device": "vmnic1",
                "ipv4": {
                    "ipAddr": "192.168.11.89",
                    "gateway": "192.168.11.1",
                    "netmask": "255.255.255.0"
                }
            },
            {
                "device": "vmnic4",
                "ipv6": {
                    "ipAddr": "fec0::6ab4:0:5efe:157.60.14.21",
                    "gateway": "fe80::5efe:131.107.25.1",
                    "netmask": "ffff.ffff.ffff.ffff.0.0.0.0"
                }
            },
        ],
        "installDisk": "naa.123456",
        "postInstallCommands": [
            "cd /var/log",
            "ls -l"
        ],
        "switchDevices": [
            {
                "switchName": "vSwitch0",
                "uplinks": [ "vmnic0", "vmnic4" ]
            },
            {
                "switchName": "vSwitch1"
            }
        ]
    };

    var positiveSetParam = {
    };

    var negativeSetParam = {
        "switchDevices[0].uplinks[1]": "vmnic0", //cannot set duplicated uplinks
        "switchDevices[0]": { "switchName": "vSwitch1" } //cannot set duplicated switchDevice
    };

    var positiveUnsetParam = [
        "postInstallCommands",
        "switchDevices"
    ];

    var negativeUnsetParam = [
        "switchDevices[0].switchName"
    ];

    var SchemaUtHelper = require('./schema-ut-helper');
    new SchemaUtHelper(schemaFilePath, canonical).batchTest(
        positiveSetParam, negativeSetParam, positiveUnsetParam, negativeUnsetParam);
});
