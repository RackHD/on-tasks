// Copyright 2015, EMC, Inc.

'use strict';

module.exports = {
    friendlyName: 'Install Ubuntu',
    injectableName: 'Task.Os.Install.Ubuntu',
    implementsTask: 'Task.Base.Os.Install',
    options: {
        username: 'renasar',
        rootPassword: 'RackHDRocks!',
        profile: 'install-trusty.ipxe',
        hostname: 'renasar-nuc',
        comport: 'ttyS0',
        uid: 1010,
        domain: 'renasar.com',
        completionUri: 'renasar-ansible.pub'
    },
    properties: {
        os: {
            linux: {
                distribution: 'ubuntu',
                release: 'trusty'
            }
        }
    }
};
