module.exports = {
    friendlyName: 'Set Node Pxeboot',
    injectableName: 'Task.Obm.Node.Pxeboot',
    implementsTask: 'Task.Base.Obm.Node',
    options: {
        action: 'setBootPxe'
    },
    properties: {
        power: {}
    }
};
