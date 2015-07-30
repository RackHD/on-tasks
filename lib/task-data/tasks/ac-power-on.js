module.exports = {
    friendlyName: 'AC Power On Node',
    injectableName: 'Task.Obm.Node.AcPowerOn',
    implementsTask: 'Task.Base.Obm.Node',
    options: {
        action: 'powerOn',
        obmServiceName: 'panduit-obm-service'
    },
    properties: {
        power: {}
    }
};
