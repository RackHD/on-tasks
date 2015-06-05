module.exports = {
    friendlyName: 'Cold reset BMC',
    injectableName: 'Task.Obm.Node.McResetCold',
    implementsTask: 'Task.Base.Obm.Node',
    options: {
        action: 'mcResetCold',
        obmServiceName: 'ipmi-obm-service'
    },
    properties: { }
};
