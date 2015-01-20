module.exports = {
    friendlyName: 'Set Node Pxeboot',
    injectableName: 'Task.Obm.Node.PxeBoot',
    implementsTask: 'Task.Base.Obm.Node',
    options: {
        action: 'setBootPxe'
    },
    properties: {
        power: {}
    }
};
