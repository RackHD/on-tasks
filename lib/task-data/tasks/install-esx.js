// Copyright 2015, EMC, Inc.

'use strict';

module.exports = {
    friendlyName: 'Install Esx',
    injectableName: 'Task.Os.Install.Esx',
    implementsTask: 'Task.Base.Os.Install',
    schemaRef: 'rackhd/schemas/v1/tasks/install-esxi',
    options: {
        osType: 'esx', //readonly option, should avoid change it
        profile: 'install-esx.ipxe',
        installScript: 'esx-ks',
        installScriptUri: '{{api.templates}}/{{options.installScript}}',
        completionUri: '{{options.installScript}}',
        rackhdCallbackScript: 'esx.rackhdcallback',
        esxBootConfigTemplate: 'esx-boot-cfg',
        esxBootConfigTemplateUri: '{{api.templates}}/{{options.esxBootConfigTemplate}}',
        comport: 'com1',
        comportaddress: '0x3f8', //com1=0x3f8, com2=0x2f8, com3=0x3e8, com4=0x2e8
        version: null,
        repo: '{{api.server}}/esxi/{{options.version}}',
        hostname: 'localhost',
        domain: null,
        rootPassword: "RackHDRocks!",
        rootSshKey: null,
        users: [],
        networkDevices: [],
        dnsServers: [],
        installDisk: null,

        // If specified, this contains an array of objects with switchName and uplinks (optional)
        // parameters.  If 'uplinks' is omitted, the vswitch will be created with no uplinks.
        //  - switchName (required): The name of vswitch
        //  - uplinks (optional): The array of vmnic# devices to set as the uplinks
        //
        // example:
        // {
        //    "switchName": "vSwitch0",
        //    "uplinks": ["vmnic0", "vmnic1"]
        // }
        switchDevices: [],

        //If specified, this contains an array of string commands that will be run at the end of the
        //post installation step.  This can be used by the customer to tweak final system
        //configuration.
        postInstallCommands: []
  },
    properties: {
        os: {
            hypervisor: {
                type: 'esx'
            }
        }
    }
};
