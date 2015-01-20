module.exports = {
    injectableName: 'Task.Base.Linux.Commands',
    runJob: 'Job.Linux.Commands',
    requiredOptions: [
        'commands',
        'routingKey'
    ],
    properties: {
        commands: {}
    }
};
