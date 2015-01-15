module.exports = {
    runJob: 'Task.Linux.Bootstrapper',
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
