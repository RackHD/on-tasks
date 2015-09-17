// Copyright 2015, EMC, Inc.

module.exports = {
    friendlyName: 'Reboot Node',
    injectableName: 'Task.Obm.Node.Reboot',
    implementsTask: 'Task.Base.Obm.Node',
    options: {
        action: 'reboot',
        obmServiceName: 'ipmi-obm-service'
    },
    properties: {
        power: {
            state: "reboot"
        }
    }
};
