// Copyright 2015, EMC, Inc.

'use strict';

module.exports = {
    friendlyName: 'Bootstrap Ubuntu',
    injectableName: 'Task.Linux.Bootstrap.Ubuntu',
    implementsTask: 'Task.Base.Linux.Bootstrap',
    options: {
        kernelFile: 'vmlinuz-3.16.0-25-generic',
        initrdFile: 'initrd.img-3.16.0-25-generic',
        kernelUri: '{{ api.server }}/common/{{ options.kernelFile }}',
        initrdUri: '{{ api.server }}/common/{{ options.initrdFile }}',
        basefs: 'common/base.trusty.3.16.0-25-generic.squashfs.img',
        overlayfs: 'common/discovery.overlay.cpio.gz',
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
