module.exports = {
    friendlyName: 'Power On Node',
    injectableName: 'Task.Obm.Node.PowerOn',
    implementsTask: 'Task.Base.Obm.Node',
    options: {
        action: 'powerOff'
    },
    properties: {
        power: {}
    }
};
