// Copyright 2015, EMC, Inc.

'use strict';

module.exports = {
    friendlyName: 'Install CoreOS',
    injectableName: 'Task.Os.Install.CoreOS',
    implementsTask: 'Task.Base.Os.Install',
    optionsSchema: 'install-coreos.json',
    options: {
        osType: 'linux',
        profile: 'install-coreos.ipxe',
        installScript: 'install-coreos.sh',
        installScriptUri: '{{ api.templates }}/{{ options.installScript }}?nodeId={{ task.nodeId }}', //jshint ignore: line
        comport: 'ttyS0',
        hostname: 'coreos-node',
        installDisk: '/dev/sda',
        repo: '{{file.server}}/coreos',
        version: 'current',
        rootPassword: "RackHDRocks!",

        progressMilestones: {
            //jshint ignore: start
            requestProfile:     { value: 1, description: 'Enter ipxe and request OS installation profile' },
            enterProfile:       { value: 2, description: 'Enter profile, start to download installer'},
            bootInstaller:      { value: 3, description: 'Boot into installer' },
            executeInstallation:{ value: 4, description: 'Execute OS installation'},
            completed:          { value: 5, description: 'Finished OS installation'}
            //jshint ignore: end
        }
    },
    properties: {
        os: {
            linux: {
                distribution: 'coreos'
            }
        }
    }
};
