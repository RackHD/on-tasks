// Copyright 2015, EMC, Inc.

'use strict';

module.exports = {
    friendlyName: 'Install CentOS',
    injectableName: 'Task.Os.Install.CentOS',
    implementsTask: 'Task.Base.Os.Install',
    optionsSchema: 'install-centos.json',
    options: {
        osType: 'linux', //readonly options, should avoid change it
        profile: 'install-centos.ipxe',
        installScript: 'centos-ks',
        installScriptUri: '{{ api.templates }}/{{ options.installScript }}?nodeId={{ task.nodeId }}',
        hostname: 'localhost',
        comport: 'ttyS0',
        rackhdCallbackScript: 'centos.rackhdcallback',
        repo: '{{file.server}}/centos/{{options.version}}/os/x86_64',
        rootPassword: "RackHDRocks!",
        remoteLogging: false
    },
    properties: {
        os: {
            linux: {
                distribution: 'centos'
            }
        }
    }
};
