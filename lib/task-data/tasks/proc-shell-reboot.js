module.exports = {
    friendlyName: 'Reboot Node via proc',
    injectableName: 'Task.ProcShellReboot',
    implementsTask: 'Task.Base.ShellReboot',
    options: {
        rebootCode: 1
    },
    properties: {
        power: {}
    }
};
