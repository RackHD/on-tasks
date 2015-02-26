module.exports = {
    friendlyName: 'Install CentOS',
    injectableName: 'Task.Os.Install.CentOS',
    implementsTask: 'Task.Base.Os.Install',
    options: {
        username: 'renasar',
        profile: 'install-centos65.ipxe',
        hostname: 'renasar-nuc',
        comport: 'ttyS0',
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
