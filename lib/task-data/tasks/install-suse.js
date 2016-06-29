// Copyright 2016, EMC, Inc.

'use strict';

module.exports = {
    friendlyName: 'Install SUSE',
    injectableName: 'Task.Os.Install.SUSE',
    implementsTask: 'Task.Base.Os.Install',
    schemaRef: 'rackhd/schemas/v1/tasks/install-os-general',
    options: {
        osType: 'linux', //readonly options, should avoid change it
        profile: 'install-suse.ipxe',
        installScript: 'suse-autoinst.xml',
        installScriptUri: '{{api.templates}}/{{options.installScript}}',
        hostname: 'localhost',
        comport: 'ttyS0',
        completionUri: 'renasar-ansible.pub',
        repo: '{{api.server}}/distribution/{{options.version}}/repo/oss/',
        rootPassword: "RackHDRocks!"
    },
    properties: {
        os: {
            linux: {
                distribution: 'suse'
            }
        }
    }
};
