module.exports = {
    friendlyName: 'Install Ubuntu',
    injectableName: 'Task.Os.Install.Ubuntu',
    implementsTask: 'Task.Base.Os.Install',
    options: {
        username: 'renasar',
        password: '009miw$$987',
        profile: 'install-trusty.ipxe',
        hostname: 'renasar-nuc',
        comport: 'ttyS0',
	uid: 1010,
        domain: 'renasar.com',
        completionUri: 'renasar-ansible.pub'
    },
    properties: {
        os: {
            linux: {
                distribution: 'ubuntu',
                release: 'trusty'
            }
        }
    }
};
