// Copyright 2015, EMC, Inc.

module.exports = {
    friendlyName: 'Soft Reset Node',
    injectableName: 'Task.Obm.Node.Reset.Soft',
    implementsTask: 'Task.Base.Obm.Node',
    options: {
        action: 'softReset',
        obmServiceName: 'ipmi-obm-service'
    },
    properties: {
        power: {
            state: "softReset"
        }
    }
};
