// Copyright 2015, EMC, Inc.

module.exports = {
    friendlyName: 'Turn Off Node Identify LED',
    injectableName: 'Task.Obm.Node.IdentifyOff',
    implementsTask: 'Task.Base.Obm.Node',
    options: {
        action: 'identifyOff',
        obmServiceName: 'ipmi-obm-service'
    },
    properties: {}
};