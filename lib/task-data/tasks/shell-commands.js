module.exports = {
    friendlyName: 'Shell commands',
    injectableName: 'Task.Linux.Commands',
    implementsTask: 'Task.Base.Linux.Commands',
    options: {
        commands: [
            'sudo ls /var',
            'date',
            'echo example'
        ],
        routingKey: 'linux-commands-example-routing-key'
    },
    properties: {
        commands: {}
    }
};
