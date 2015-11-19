// Copyright 2015, EMC, Inc.

'use strict';

module.exports = {
    friendlyName: 'Install CentOS',
    injectableName: 'Task.Os.Install.CentOS',
    implementsTask: 'Task.Base.Os.Install',
    options: {
        profile: 'install-centos.ipxe',
        hostname: 'localhost',
        comport: 'ttyS0',
        domain: 'rackhd.github.com',
        completionUri: 'renasar-ansible.pub',
        version: null, //This task is suitable for CentOS/RHEL with different versions,
                       //so user must explicitly input the version
        repo: '{{api.server}}/centos/{{options.version}}/os/x86_64',
        rootPassword: null,
        rootSshKey: null,
        users: [],
        networkDevices: [],
        dnsServers: [],
        driveId: 'sda'
    },
    properties: {
        os: {
            linux: {
                distribution: 'centos'
            }
        }
    }
};
