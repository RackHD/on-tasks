module.exports = {
    friendlyName: 'Install OS',
    injectableName: 'Task.Base.Os.Install',
    runJob: 'Job.Os.Install',
    requiredOptions: [
        'profile',
        'completionUri'
    ],
    properties: {
        os: {
            type: 'install'
        }
    }
};
