// Copyright 2015, EMC, Inc.

'use strict';

module.exports = {
    friendlyName: 'Install CoreOS',
    injectableName: 'Task.Os.Install.CoreOS',
    implementsTask: 'Task.Base.Os.Install',
    options: {
        profile: 'install-coreos.ipxe',
        comport: 'ttyS0',
        hostname: 'coreos-node',
        installDisk: '/dev/sda',
        completionUri: 'pxe-cloud-config.yml',
        repo: '{{api.server}}/coreos',
        version: 'current'
    },
    properties: {
        os: {
            linux: {
                distribution: 'coreos'
            }
        }
    }
};
