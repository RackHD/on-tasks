// Copyright 2015, EMC, Inc.

module.exports = {
    friendlyName: 'Install CentOS',
    injectableName: 'Task.Os.Install.CentOS',
    implementsTask: 'Task.Base.Os.Install',
    options: {
        username: 'renasar',
        profile: 'install-centos.ipxe',
        hostname: 'renasar-nuc',
        comport: 'ttyS0',
        uid: 1010,
        domain: 'renasar.com',
        completionUri: 'renasar-ansible.pub',
        version: null, //This task is suitable for CentOS/RHEL with different versions,
                       //so user must explicitly input the version
        repo: '{{api.server}}/centos/{{options.version}}/os/x86_64'
    },
    properties: {
        os: {
            linux: {
                distribution: 'centos'
            }
        }
    }
};
