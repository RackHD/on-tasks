module.exports = {
    friendlyName: 'Install CentOS',
    injectableName: 'Task.Linux.Install.CentOS',
    implementsTask: 'Task.Base.Linux.Install',
    options: {
        username: 'renasar',
        profile: 'install-centos65.ipxe',
        hostname: 'renasar-nuc',
        uid: 1010,
        domain: 'renasar.com',
        completionUri: 'renasar-ansible.pub'
    },
    properties: {
        os: {
            linux: {
                distribution: 'centos'
            }
        }
    }
};
