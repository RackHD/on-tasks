module.exports = {
    friendlyName: 'Install CoreOS',
    injectableName: 'Task.Os.Install.CoreOS',
    implementsTask: 'Task.Base.Os.Install',
    options: {
        // NOTE: user/pass aren't used by the coreos installer at the moment,
        // but they are required values
        username: 'root',
        password: 'root',
        profile: 'install-coreos.ipxe',
        hostname: 'coreos-node',
        completionUri: 'pxe-cloud-config.yml'
    },
    properties: {
        os: {
            linux: {
                distribution: 'coreos'
            }
        }
    }
};
