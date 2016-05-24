// Copyright 2015, EMC, Inc.

'use strict';

module.exports = {
    friendlyName: 'Install Ubuntu',
    injectableName: 'Task.Os.Install.Ubuntu',
    implementsTask: 'Task.Base.Os.Install',
    options: {
        osType: 'linux', //readonly options, should avoid change it
        profile: 'install-ubuntu.ipxe',
        preseed: 'ubuntu-preseed',
        preseedUri: '{{api.templates}}/{{options.preseed}}',
        hostname: 'localhost',
        comport: 'ttyS0',
        domain: 'rackhd',
        completionUri: 'renasar-ansible.pub',
        version: 'trusty',
        repo: '{{api.server}}/ubuntu',
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
                distribution: 'ubuntu'
            }
        }
    }
};
