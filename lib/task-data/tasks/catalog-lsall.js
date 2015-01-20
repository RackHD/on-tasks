module.exports = {
    friendlyName: 'Catalog lsall',
    injectableName: 'Task.Catalog.lsall',
    implementsTask: 'Task.Base.Linux.Catalog',
    options: {
        commands: [
            'sudo lspci -nn -vmm',
            'sudo lshw -json',
            'sudo lsscsi --size'
        ]
    },
    properties: {
        catalog: {
            type: 'lsall'
        }
    }
};
