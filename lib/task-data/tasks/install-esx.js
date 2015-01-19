module.exports = {
    friendlyName: 'Install Esx',
    injectableName: 'Task.Os.Install.Esx',
    implementsTask: 'Task.Base.Os.Install',
    options: {
        profile: 'install-esx.ipxe',
        completionUri: 'esx-ks',
        esxBootConfigTemplate: 'esx-boot-cfg-hybrid'
    },
    properties: {
        os: {
            hypervisor: {
                type: 'esx'
            }
        }
    }
};
