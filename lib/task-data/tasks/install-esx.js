// Copyright 2015, EMC, Inc.

module.exports = {
    friendlyName: 'Install Esx',
    injectableName: 'Task.Os.Install.Esx',
    implementsTask: 'Task.Base.Os.Install',
    options: {
        profile: 'install-esx.ipxe',
        completionUri: 'esx-ks',
        esxBootConfigTemplate: 'esx-boot-cfg-hybrid',
        comport: 'com1',
        comportaddress: '0x3f8', //com1=0x3f8, com2=0x2f8, com3=0x3e8, com4=0x2e8
        version: '5.5', //this task is only designed for ESXi 5.5
        repo: '{{api.server}}/esxi/{{options.version}}',
        hostname: 'localhost',
        domain: 'rackhd.github.com',
        rootPassword: null,
        rootSshKey: null,
        users: [],
        networkDevices: [],
        dnsServers: []
  },
    properties: {
        os: {
            hypervisor: {
                type: 'esx'
            }
        }
    }
};
