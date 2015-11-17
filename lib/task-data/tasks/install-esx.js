// Copyright 2015, EMC, Inc.

'use strict';

module.exports = {
    friendlyName: 'Install Esx',
    injectableName: 'Task.Os.Install.Esx',
    implementsTask: 'Task.Base.Os.Install',
    options: {
        profile: 'install-esx.ipxe',
        completionUri: 'esx-ks',
        esxBootConfigTemplate: 'esx-boot-cfg',
        comport: 'com1',
        comportaddress: '0x3f8', //com1=0x3f8, com2=0x2f8, com3=0x3e8, com4=0x2e8
        version: null,
        repo: '{{api.server}}/esxi/{{options.version}}',
        hostname: 'localhost',
        domain: 'rackhd',
        rootPassword: null,
        rootSshKey: null,
        users: [],
        networkDevices: [],
        dnsServers: [],
        driveId: 'firstdisk'
  },
    properties: {
        os: {
            hypervisor: {
                type: 'esx'
            }
        }
    }
};
