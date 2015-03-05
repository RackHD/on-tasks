module.exports = {
    friendlyName: 'Power Off Node',
    injectableName: 'Task.Obm.Node.PowerOff',
    implementsTask: 'Task.Base.Obm.Node',
    options: {
        action: 'powerOff',
        obmServiceName: 'ipmi-obm-service'
    },
    properties: {
        power: {}
    }
};
