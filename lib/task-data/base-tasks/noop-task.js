module.exports = {
    injectableName: 'Task.Base.noop',
    runJob: 'Task.noop',
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
