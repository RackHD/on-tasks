// Copyright 2016, EMC, Inc.

'use strict';

module.exports = {
    friendlyName: 'Install SUSE',
    injectableName: 'Task.Os.Install.SUSE',
    implementsTask: 'Task.Base.Os.Install',
    options: {
        osType: 'linux', //readonly options, should avoid change it
        profile: 'install-suse.ipxe',
        installScript: 'suse-autoinst.xml',
        installScriptUri: '{{api.templates}}/{{options.installScript}}',
        hostname: 'localhost',
        comport: 'ttyS0',
        domain: 'rackhd',
        completionUri: 'renasar-ansible.pub',
        version: null, //This task is suitable for openSUSE/SLES with different versions,
                       //so user must explicitly input the version
        repo: '{{api.server}}/distribution/{{options.version}}/repo/oss/',
        rootPassword: "RackHDRocks!",
        rootSshKey: null,
        users: [],
        networkDevices: [],
        dnsServers: [],
        installDisk: null,
        kvm: false
    },
    properties: {
        os: {
            linux: {
                distribution: 'suse'
            }
        }
    }
};
