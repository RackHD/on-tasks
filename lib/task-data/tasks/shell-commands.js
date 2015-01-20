module.exports = {
    friendlyName: 'Shell commands',
    injectableName: 'Task.Linux.Commands',
    implementsTask: 'Task.Base.Linux.Commands',
    options: {
        commands: [
            { command: 'sudo ls /var', format: 'raw', source: 'ls var' },
            { command: 'sudo lshw -json', format: 'json', source: 'lshw user' },
        ]
    },
    properties: {
        commands: {}
    }
};
