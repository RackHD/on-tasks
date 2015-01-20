module.exports = {
    friendlyName: 'Linux Bootstrapper',
    injectableName: 'Task.Base.Linux.Bootstrap',
    runJob: 'Job.Linux.Bootstrap',
    requiredOptions: [
        'kernelversion',
        'kernel',
        'initrd',
        'basefs',
        'overlayfs',
        'profile'
    ],
    properties: {
        os: {
            linux: {
                type: 'microkernel'
            }
        }
    }
};
