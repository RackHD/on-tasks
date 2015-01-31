module.exports = {
    friendlyName: 'Reboot Node',
    injectableName: 'Task.Obm.Node.Reboot',
    implementsTask: 'Task.Base.Obm.Node',
    options: {
        action: 'reboot'
    },
    properties: {
        power: {
            state: "reboot"
        }
    }
};
