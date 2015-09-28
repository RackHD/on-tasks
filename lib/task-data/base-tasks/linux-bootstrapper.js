// Copyright 2015, EMC, Inc.

module.exports = {
    friendlyName: 'Linux Bootstrapper',
    injectableName: 'Task.Base.Linux.Bootstrap',
    runJob: 'Job.Linux.Bootstrap',
    requiredOptions: [
        'kernelFile',
        'initrdFile',
        'kernelUri',
        'initrdUri',
        'basefs',
        'overlayfs',
        'profile'
    ],
    requiredProperties: {},
    properties: {
        os: {
            linux: {
                type: 'microkernel'
            }
        }
    }
};
