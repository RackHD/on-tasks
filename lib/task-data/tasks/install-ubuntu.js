// Copyright 2015, EMC, Inc.

'use strict';

module.exports = {
    friendlyName: 'Install Ubuntu',
    injectableName: 'Task.Os.Install.Ubuntu',
    implementsTask: 'Task.Base.Os.Install',
    schemaRef: 'install-ubuntu.json',
    options: {
        osType: 'linux', //readonly options, should avoid change it
        profile: 'install-ubuntu.ipxe',
        installScript: 'ubuntu-preseed',
        installScriptUri: '{{api.templates}}/{{options.installScript}}',
        hostname: 'localhost',
        comport: 'ttyS0',
        version: 'trusty',
        repo: '{{api.server}}/ubuntu',
        baseUrl: 'dists/trusty/main/installer-amd64/current/images/netboot/ubuntu-installer/amd64',
        rootPassword: "RackHDRocks!",
        interface: "auto",
        installDisk: "/dev/sda",
        kvm: false,
        kargs:{}
    },
    properties: {
        os: {
            linux: {
                distribution: 'ubuntu'
            }
        }
    }
};
