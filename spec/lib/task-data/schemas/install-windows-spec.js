// Copyright 2016, EMC, Inc.
/* jshint node: true */

'use strict';

describe(require('path').basename(__filename), function() {
    var schemaFileName = 'install-windows.json';

    var canonical = {
        osType: 'windows',
        profile: 'install-windows.ipxe',
        hostname: 'localhost',
        domain: 'rackhd',
        username: 'onrack',
        password: 'mypassword',
        networkDevices: [
            {
                device: 'Ethernet',
                ipv4: {
                    ipAddr: '172.31.128.222',
                    gateway: '192.168.1.1',
                    netmask: '255.255.252.0',
                    vlanIds: [104, 100]
                }
            }
        ],
        productkey: 'xxxx-xxxx-xxxx-xxxx-xxxx',
        smbUser: 'onrack',
        smbPassword: 'onrack',
        smbRepo: '\\\\172.31.128.1\\windowsServer2012',
        repo: 'http://172.31.128.1:8080/winpe'
    };

    var positiveSetParam = {
        smbRepo: ['\\\\abc.com']
    };

    var negativeSetParam = {
        smbRepo: [null, '', 'http://127.0.0.1/abc'],
        productkey: [null, ''],
        smbUser: [null, ''],
        smbPassword: [null, '']
    };

    var positiveUnsetParam = [
        'hostname',
        'domain',
        'username',
        'password',
        'networkDevices',
        'networkDevices[0].ipv4.vlanIds'
    ];

    var negativeUnsetParam = [
        'osType',
        'profile',
        'productkey',
        'smbUser',
        'smbPassword',
        'smbRepo',
        'repo',
        'networkDevices[0].device',
        'networkDevices[0].ipv4.ipAddr',
        'networkDevices[0].ipv4.netmask',
        'networkDevices[0].ipv4.gateway'
    ];

    var SchemaUtHelper = require('./schema-ut-helper');
    new SchemaUtHelper(schemaFileName, canonical).batchTest(
        positiveSetParam, negativeSetParam, positiveUnsetParam, negativeUnsetParam);
});
