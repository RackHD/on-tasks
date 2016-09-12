// Copyright 2015, EMC, Inc.

'use strict';

module.exports = {
    friendlyName: 'Install CentOS',
    injectableName: 'Task.Os.Install.CentOS',
    implementsTask: 'Task.Base.Os.Install',
    schemaRef: 'install-centos.json',
    options: {
        osType: 'linux', //readonly options, should avoid change it
        profile: 'install-centos.ipxe',
        installScript: 'centos-ks',
        installScriptUri: '{{api.templates}}/{{options.installScript}}',
        hostname: 'localhost',
        comport: 'ttyS0',
        rackhdCallbackScript: 'centos.rackhdcallback',
        repo: '{{api.server}}/centos/{{options.version}}/os/x86_64',
        rootPassword: "RackHDRocks!"
    },
    properties: {
        os: {
            linux: {
                distribution: 'centos'
            }
        }
    }
};
