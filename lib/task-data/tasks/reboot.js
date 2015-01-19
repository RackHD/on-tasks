module.exports = {
    friendlyName: 'Reboot Node',
    injectableName: 'Task.Power.Node.Reboot',
    implementsTask: 'Task.Base.Obm.Node',
    options: {
        action: 'reboot'
    },
    properties: {
        power: {}
    }
};
