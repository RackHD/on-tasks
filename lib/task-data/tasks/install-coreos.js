// Copyright 2015, EMC, Inc.

'use strict';

module.exports = {
    friendlyName: 'Install CoreOS',
    injectableName: 'Task.Os.Install.CoreOS',
    implementsTask: 'Task.Base.Os.Install',
    schemaRef: 'install-coreos.json',
    options: {
        osType: 'linux',
        profile: 'install-coreos.ipxe',
        installScript: 'install-coreos.sh',
        installScriptUri: '{{api.templates}}/{{options.installScript}}',
        comport: 'ttyS0',
        hostname: 'coreos-node',
        installDisk: '/dev/sda',
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
