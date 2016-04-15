// Copyright 2015, EMC, Inc.

'use strict';

module.exports = {
    friendlyName: 'Bootstrap Ubuntu',
    injectableName: 'Task.Linux.Bootstrap.Ubuntu',
    implementsTask: 'Task.Base.Linux.Bootstrap',
    options: {
        kernelVersion: '3.19.0-56-generic',
        kernelFile: 'vmlinuz-{{ options.kernelVersion }}',
        initrdFile: 'initrd.img-{{ options.kernelVersion }}',
        kernelUri: '{{ api.server }}/common/{{ options.kernelFile }}',
        initrdUri: '{{ api.server }}/common/{{ options.initrdFile }}',
        basefs: 'common/base.trusty.{{ options.kernelVersion }}.squashfs.img',
        overlayfs: 'common/discovery.{{ options.kernelVersion }}.overlay.cpio.gz',
        profile: 'linux.ipxe',
        comport: 'ttyS0'
    },
    properties: {
        os: {
            linux: {
                distribution: 'ubuntu',
                release: 'trusty',
                kernel: '3.19.0-56-generic'
            }
        }
    }
};
