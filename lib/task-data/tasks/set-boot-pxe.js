module.exports = {
    friendlyName: 'Set Node Pxeboot',
    injectableName: 'Task.Power.Node.Pxeboot',
    implementsTask: 'Task.Base.Obm.Node',
    options: {
        action: 'setBootPxe'
    },
    properties: {
        power: {}
    }
};
