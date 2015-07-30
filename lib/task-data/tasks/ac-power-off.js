module.exports = {
    friendlyName: 'AC Power Off Node',
    injectableName: 'Task.Obm.Node.AcPowerOff',
    implementsTask: 'Task.Base.Obm.Node',
    options: {
        action: 'powerOff',
        obmServiceName: 'panduit-obm-service'
    },
    properties: {
        power: {}
    }
};
