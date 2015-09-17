// Copyright 2015, EMC, Inc.

module.exports = {
    friendlyName: 'Reset Node',
    injectableName: 'Task.Obm.Node.Reset',
    implementsTask: 'Task.Base.Obm.Node',
    options: {
        action: 'reset',
        obmServiceName: 'ipmi-obm-service'
    },
    properties: {
        power: {
            state: "reset"
        }
    }
};
