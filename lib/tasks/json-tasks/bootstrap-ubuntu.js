module.exports = {
    friendlyName: 'Bootstrap Ubuntu',
    implementsTask: 'Task.Linux.Bootstrapper',
    options: {
        kernel: '3.13',
        initrd: '3.13',
        basefs: 'base-trusty-14.04',
        overlayfs: 'overlayfs-trusty-14.04'
    },
    properties: {
        os: {
            linux: {
                flavor: 'ubuntu',
                kernel: '3.13'
            }
        }
    }
};
