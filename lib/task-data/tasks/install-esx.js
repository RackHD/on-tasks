module.exports = {
    friendlyName: 'Install Esx',
    injectableName: 'Task.Os.Install.Esx',
    implementsTask: 'Task.Base.Os.Install',
    options: {
        profile: 'install-esx.ipxe',
        completionUri: 'esx-ks',
        esxBootConfigTemplate: 'esx-boot-cfg-hybrid',
	comport: 'com1'
	comportaddress": '0x3f8' //com1=0x3f8, com2=0x2f8, com3=0x3e8, com4=0x2e8
    },
    properties: {
        os: {
            hypervisor: {
                type: 'esx'
            }
        }
    }
};
