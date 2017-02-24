// Copyright 2015, EMC, Inc.

'use strict';

module.exports = {
    friendlyName: 'Install Ubuntu',
    injectableName: 'Task.Os.Install.Ubuntu',
    implementsTask: 'Task.Base.Os.Install',
    optionsSchema: 'install-ubuntu.json',
    options: {
        osType: 'linux', //readonly options, should avoid change it
        profile: 'install-ubuntu.ipxe',
        installScript: 'ubuntu-preseed',
        installScriptUri: '{{ api.templates }}/{{ options.installScript }}?nodeId={{ task.nodeId }}', //jshint ignore: line
        rackhdCallbackScript: 'ubuntu.rackhdcallback',
        hostname: 'localhost',
        comport: 'ttyS0',
        version: 'trusty',
        repo: '{{file.server}}/ubuntu',
        baseUrl: 'dists/trusty/main/installer-amd64/current/images/netboot/ubuntu-installer/amd64',
        rootPassword: "RackHDRocks!",
        interface: "auto",
        installDisk: "/dev/sda",
        kvm: false,
        kargs:{},

        //Some milestones are injected where can add custom commands.
        //Refer to below link for those injectable points:
        //https://help.ubuntu.com/lts/installation-guide/armhf/apbs05.html
        progressMilestones: {
            //jshint ignore: start
            requestProfile:     { value: 1, description: 'Enter ipxe and request OS installation profile' },
            enterProfile:       { value: 2, description: 'Enter profile, start to download installer'},
            startInstaller:     { value: 3, description: 'Start installer and prepare installation' },
            preConfig:          { value: 4, description: 'Enter pre OS configuration'},
            startPartition:     { value: 5, description: 'Start partition'},
            postConfig:         { value: 6, description: 'Enter post OS configuration'},
            completed:          { value: 7, description: 'Finished OS installation'}
            //jshint ignore: end
        }
    },
    properties: {
        os: {
            linux: {
                distribution: 'ubuntu'
            }
        }
    }
};
