// Copyright 2016, EMC, Inc.

'use strict';

module.exports = {
    friendlyName: 'Install Photon OS',
    injectableName: 'Task.Os.Install.PhotonOS',
    implementsTask: 'Task.Base.Os.Install',
    optionsSchema: 'install-photon-os.json',
    options: {
        osType: 'linux', //readonly options, should avoid change it
        profile: 'install-photon-os.ipxe',
        installScript: 'photon-os-ks',
        installScriptUri: '{{ api.templates }}/{{ options.installScript }}?nodeId={{ task.nodeId }}',
        hostname: 'localhost',
        comport: 'ttyS0',
        rackhdCallbackScript: 'photon-os.rackhdcallback',
        version: "1.0",
        repo: '{{file.server}}/photon/{{options.version}}',
        rootPassword: "RackHDRocks!",
        installDisk: "/dev/sda",
        installType: "minimal"
    },
    properties: {
        os: {
            linux: {
                distribution: 'photon-os'
            }
        }
    }
};
