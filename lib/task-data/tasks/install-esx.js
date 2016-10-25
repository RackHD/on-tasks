// Copyright 2015, EMC, Inc.

'use strict';

module.exports = {
    friendlyName: 'Install Esx',
    injectableName: 'Task.Os.Install.ESXi',
    implementsTask: 'Task.Base.Os.Install',
    schemaRef: 'install-esxi.json',
    options: {
        osType: 'esx', //readonly option, should avoid change it
        profile: 'install-esx.ipxe',
        installScript: 'esx-ks',
        installScriptUri: '{{api.templates}}/{{options.installScript}}',
        rackhdCallbackScript: 'esx.rackhdcallback',
        esxBootConfigTemplate: 'esx-boot-cfg',
        esxBootConfigTemplateUri: '{{api.templates}}/{{options.esxBootConfigTemplate}}',
        comport: 'com1',
        comportaddress: '0x3f8', //com1=0x3f8, com2=0x2f8, com3=0x3e8, com4=0x2e8
        repo: '{{file.server}}/esxi/{{options.version}}',
        hostname: 'localhost',
        rootPassword: "RackHDRocks!",
        kargs: {}
  },
    properties: {
        os: {
            hypervisor: {
                type: 'esx'
            }
        }
    }
};
