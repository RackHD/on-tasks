module.exports = {
    friendlyName: 'Install Linux',
    injectableName: 'Task.Base.Linux.Install',
    runJob: 'Job.Linux.Install',
    requiredOptions: [
        'username',
        'hostname',
        'profile'
    ],
    properties: {
        os: {
            linux: {
                type: 'install'
            }
        }
    }
};
