// Copyright 2016, EMC, Inc.
/* jshint node: true */

'use strict';

describe(require('path').basename(__filename), function() {
    var SchemaUtHelper = require('./schema-ut-helper');
    var schemaHelper = new SchemaUtHelper('/lib/task-data/schemas/install-os-common-schema.json');
    schemaHelper.init();

    var datas = [
        {
            "version": "7.0",
            "repo": "http://centos.com/images/7.0/os/x86_64",
            "domain": "rackhd.domain",
            "users": [
                {
                    "name": "rackhd",
                    "password": "ILikeRackHD",
                    "uid": 1010
                },
                {
                    "name": "guest",
                    "password": "IWantTryRackHD"
                }
            ],
            "rootPassword": "RackHD_Password",
            "hostname": "centos.rackhd",
            "networkDevices": [
                {
                    "device": "eth0",
                    "ipv4": {
                        "ipAddr": "172.31.128.99",
                        "netmask": "255.255.252.0",
                        "gateway": "172.31.128.1",
                        "vlanIds": [100, 2999]
                    }
                },
                {
                    "device": "espn3",
                    "ipv4": {
                        "ipAddr": "192.168.188.20",
                        "netmask": "255.255.255.0",
                        "gateway": "192.168.188.1"
                    }
                }
            ],
            "dnsServers": ["172.31.128.1"],
            "installDisk": '/dev/sdb'
        },
        {
            "version": "6.0",
            "repo": "http://vmware.com/images/6.0/esxi",
            "domain": "rackhd.domain",
            "rootPassword": "Password",
            "hostname": "esxi.rackhd",
            "installDisk": 2
        }
    ];
    schemaHelper.test(datas, true);

    datas = [
        {
            "repo": "http://vmware.com/images/6.0/esxi",
            "domain": "rackhd.domain",
            "rootPassword": "Password",
            "hostname": "esxi.rackhd"
        },
        {
            "version": "6.0",
            "repo": "http://vmware.com/images/6.0/esxi",
            "domain": "rackhd.domain",
            "hostname": "esxi.rackhd"
        }
    ];
    schemaHelper.test(datas, false);
});
