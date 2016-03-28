// Copyright 2015, EMC, Inc.

'use strict';

module.exports = {
    friendlyName: 'Bootstrap Ubuntu',
    injectableName: 'Task.Linux.Bootstrap.Ubuntu',
    implementsTask: 'Task.Base.Linux.Bootstrap',
    options: {
        kernelFile: 'vmlinuz-3.19.0-56-generic',
        initrdFile: 'initrd.img-3.19.0-56-generic',
        kernelUri: '{{ api.server }}/common/{{ options.kernelFile }}',
        initrdUri: '{{ api.server }}/common/{{ options.initrdFile }}',
        basefs: 'common/base.trusty.3.19.0-56-generic.squashfs.img',
        overlayfs: 'common/discovery.3.19.0-56-generic.overlay.cpio.gz',
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
