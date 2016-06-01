// Copyright 2015, EMC, Inc.

'use strict';

module.exports = {
    friendlyName: 'Install Esx',
    injectableName: 'Task.Os.Install.Esx',
    implementsTask: 'Task.Base.Os.Install',
    options: {
        osType: 'esx', //readonly option, should avoid change it
        profile: 'install-esx.ipxe',
        kickstart: 'esx-ks',
        kickstartUri: '{{api.templates}}/{{options.kickstart}}',
        completionUri: '{{options.kickstart}}',
        rackhdCallbackScript: 'esx.rackhdcallback',
        esxBootConfigTemplate: 'esx-boot-cfg',
        esxBootConfigTemplateUri: '{{api.templates}}/{{options.esxBootConfigTemplate}}',
        comport: 'com1',
        comportaddress: '0x3f8', //com1=0x3f8, com2=0x2f8, com3=0x3e8, com4=0x2e8
        version: null,
        repo: '{{api.server}}/esxi/{{options.version}}',
        hostname: 'localhost',
        domain: 'rackhd',
        rootPassword: "RackHDRocks!",
        rootSshKey: null,
        users: [],
        networkDevices: [],
        dnsServers: [],
        installDisk: null
  },
    properties: {
        os: {
            hypervisor: {
                type: 'esx'
            }
        }
    }
};
