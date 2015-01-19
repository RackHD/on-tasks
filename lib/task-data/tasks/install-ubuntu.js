module.exports = {
    friendlyName: 'Install Ubuntu',
    injectableName: 'Task.Linux.Install.Ubuntu',
    implementsTask: 'Task.Base.Linux.Install',
    options: {
        username: 'renasar',
        password: '009miw$$987',
        profile: 'install-trusty.ipxe',
        hostname: 'renasar-nuc',
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
