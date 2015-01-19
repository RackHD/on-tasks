module.exports = {
    friendlyName: 'Power On Node',
    injectableName: 'Task.Power.Node.PowerOn',
    implementsTask: 'Task.Base.Obm.Node',
    options: {
        action: 'powerOff'
    },
    properties: {
        power: {}
    }
};
