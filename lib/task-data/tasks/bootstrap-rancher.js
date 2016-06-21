// Copyright 2015, EMC, Inc.

'use strict';

module.exports = {
    friendlyName: 'Bootstrap Rancher',
    injectableName: 'Task.Linux.Bootstrap.Rancher',
    implementsTask: 'Task.Base.Linux.Bootstrap',
    options: {
        kernelFile: 'vmlinuz',
        initrdFile: 'initrd',
        kernelUri: '{{ api.server }}/common/{{ options.kernelFile }}',
        initrdUri: '{{ api.server }}/common/{{ options.initrdFile }}',
        profile: 'linux.ipxe',
        comport: 'ttyS0'
    },
    properties: {
        os: {
            linux: {
                distribution: 'ubuntu',
                release: 'trusty',
                kernel: '3.16.0-25-generic'
            }
        }
    }
};
