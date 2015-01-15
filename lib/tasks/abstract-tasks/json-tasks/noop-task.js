module.exports = {
    runJob: 'Task.noop',
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
