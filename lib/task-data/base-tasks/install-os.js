module.exports = {
    friendlyName: 'Install OS',
    injectableName: 'Task.Base.Os.Install',
    runJob: 'Job.Os.Install',
    requiredOptions: [
        'profile',
        'completionUri'
    ],
    requiredProperties: {
        'power.state': 'reboot'
    },
    properties: {
        os: {
            type: 'install'
        }
    }
};
