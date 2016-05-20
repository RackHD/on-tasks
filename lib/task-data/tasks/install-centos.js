// Copyright 2015, EMC, Inc.

'use strict';

module.exports = {
    friendlyName: 'Install CentOS',
    injectableName: 'Task.Os.Install.CentOS',
    implementsTask: 'Task.Base.Os.Install',
    options: {
        osType: 'linux', //readonly options, should avoid change it

        profile: 'install-centos.ipxe',
        hostname: 'localhost',
        comport: 'ttyS0',
        domain: 'rackhd',
        completionUri: 'renasar-ansible.pub',
        rackhdCallbackScript: 'centos.rackhdcallback',
        version: null, //This task is suitable for CentOS/RHEL with different versions,
                       //so user must explicitly input the version
        repo: '{{api.server}}/centos/{{options.version}}/os/x86_64',
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
                distribution: 'centos'
            }
        }
    }
};
