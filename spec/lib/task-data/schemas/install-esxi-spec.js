// Copyright 2016, EMC, Inc.
/* jshint node: true */

'use strict';

describe(require('path').basename(__filename), function() {
    var schemaFileName = 'install-esxi.json';

    var canonical = {
        "osType": "esx",
        "profile": "install-esx.ipxe",
        "installScript": "esx-ks",
        "installScriptUri": "http://172.31.128.9090/api/current/templates/esx-ks",
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
        "ntpServers": [
            "0.vmware.pool.ntp.org",
            "1.vmware.pool.ntp.org"
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
                    "prefixlen": 64,
                    "vlanIds": [
                        101,
                        106
                    ]
                },
                "esxSwitchName": "vSwitch0"
            },
            {
                "device": "aa:bb:cc:11:22:33",
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
                    "prefixlen": 64
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
        ],
        "rackhdCallbackScript": "esx.rackhdcallback",
        "esxBootConfigTemplate": "esx-boot-cfg",
        "esxBootConfigTemplateUri": "http://172.31.128.1:9080/api/current/templates/esx-boot-cfg",
        "comport": "com1",
        "comportaddress": "0x3f8",
        "gdbPort":"none",
        "logPort":"none",
        "debugLogToSerial":"0",
        "progressMilestones": {
            "m1": { "value": 1, "description": "do task 1" },
            "m__2": { "value": 2, "description": "do task 2" },
            "completed": { "value": 3, "description": "task finished" }
        }
    };

    var positiveSetParam = {
        "comportaddress": ["0x3f8", "0x2f8", "0x3e8", "0x2e8"],
        "networkDevices[0].device": "90:e2:ba:91:1b:e4",
        "gdbPort":["com1","com2","default"],
        "logPort":["com1","com2","default"],
        "switchDevices[0].uplinks[0]": "90:e2:ba:91:1b:e4"
    };

    var negativeSetParam = {
        "comportaddress": ["com1", "com2", 1, 0x3f8],
        "gdbPort":"ttys0",
        "debugLogToSerial":"3",
        "switchDevices[0].uplinks[1]": "vmnic0", //cannot set duplicated uplinks
        "switchDevices[0]": { "switchName": "vSwitch1" }, //cannot set duplicated switchDevice
        "ntpServers[0]": "1.vmware.pool.ntp.org" //cannot set duplicated ntpServers
    };

    var positiveUnsetParam = [
        "postInstallCommands",
        "switchDevices",
        "debugLogToSerial",
        "networkDevices[0].esxSwitchName"
    ];

    var negativeUnsetParam = [
        "rackhdCallbackScript",
        "esxBootConfigTemplate",
        "esxBootConfigTemplateUri",
        "comportaddress",
        "switchDevices[0].switchName"
    ];

    require('./install-os-schema-ut-helper').test(schemaFileName, canonical);

    var SchemaUtHelper = require('./schema-ut-helper');
    new SchemaUtHelper(schemaFileName, canonical).batchTest(
        positiveSetParam, negativeSetParam, positiveUnsetParam, negativeUnsetParam);
});
