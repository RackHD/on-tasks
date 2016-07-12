// Copyright 2015, EMC, Inc.

'use strict';

module.exports = {
    friendlyName: 'Install Photon OS',
    injectableName: 'Task.Os.Install.PhotonOS',
    implementsTask: 'Task.Base.Os.Install',
    schemaRef: 'rackhd/schemas/v1/tasks/install-os-general',
    options: {
        osType: 'linux', //readonly options, should avoid change it
        profile: 'install-photon-os.ipxe',
        installScript: 'photon-os-ks',
        installScriptUri: '{{api.templates}}/{{options.installScript}}',
        hostname: 'localhost',
        comport: 'ttyS0',
        domain: 'rackhd',
        completionUri: '',
        rackhdCallbackScript: 'photon-os.rackhdcallback',
        version: "1.0", //This task is suitable for CentOS/RHEL with different versions,
                       //so user must explicitly input the version
        repo: '{{api.server}}/photon/{{options.version}}',
        rootPassword: "1qaz@WSX",
        rootSshKey: null,
        users: [],
        networkDevices: [],
        dnsServers: [],
        installDisk: "/dev/sda",
        installPartitions: [],
        kvm: false
    },
    properties: {
        os: {
            linux: {
                distribution: 'photon-os'
            }
        }
    }
};
