// Copyright 2016, EMC, Inc.

'use strict';

module.exports = {
    friendlyName: 'Bootstrap Rancher',
    injectableName: 'Task.Linux.Bootstrap.Rancher',
    implementsTask: 'Task.Base.Linux.Bootstrap',
    options: {
        kernelFile: 'vmlinuz-1.0.2-rancher',
        initrdFile: 'initrd-1.0.2-rancher',
        kernelUri: '{{ file.server }}/common/{{ options.kernelFile }}',
        initrdUri: '{{ file.server }}/common/{{ options.initrdFile }}',
        profile: 'rancherOS.ipxe',
        comport: 'ttyS0'
    },
    properties: {
        os: {
            linux: {
                distribution: 'rancher',
                release: '1.0.2',
                Linux: '4.9.30'
            }
        }
    }
};
