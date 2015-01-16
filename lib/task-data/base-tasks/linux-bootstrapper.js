module.exports = {
    injectableName: 'Task.Base.Linux.Bootstrap',
    runJob: 'Job.Linux.Bootstrap',
    requiredOptions: [
        'kernel',
        'initrd',
        'basefs',
        'overlayfs'
    ],
    properties: {
        os: {
            linux: {
                type: 'microkernel'
            }
        }
    }
};
