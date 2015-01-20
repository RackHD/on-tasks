module.exports = {
    friendlyName: 'base-noop',
    injectableName: 'Task.Base.noop',
    runJob: 'Job.noop',
    requiredOptions: [
        'option1',
        'option2',
        'option3',
    ],
    properties: {
        noop: {
            type: 'null'
        }
    }
};
