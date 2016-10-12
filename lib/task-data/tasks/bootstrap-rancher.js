// Copyright 2016, EMC, Inc.

'use strict';

module.exports = {
    friendlyName: 'Bootstrap Rancher',
    injectableName: 'Task.Linux.Bootstrap.Rancher',
    implementsTask: 'Task.Base.Linux.Bootstrap',
    options: {
        kernelFile: 'vmlinuz-0.5.0-rancher',
        initrdFile: 'initrd-0.5.0-rancher',
        kernelUri: '{{ file.server }}/common/{{ options.kernelFile }}',
        initrdUri: '{{ file.server }}/common/{{ options.initrdFile }}',
        profile: 'rancherOS.ipxe',
        comport: 'ttyS0'
    },
    properties: {
        os: {
            linux: {
                distribution: 'rancher',
                release: '0.5.0',
                Linux: '4.4.10'
            }
        }
    }
};
