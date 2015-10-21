// Copyright 2015, EMC, Inc.

module.exports = {
    friendlyName: 'Clear the System Event Log',
    injectableName: 'Task.Obm.Node.ClearSEL',
    implementsTask: 'Task.Base.Obm.Node',
    options: {
        action: 'clearSEL',
        obmServiceName: 'ipmi-obm-service'
    },
    properties: {}	
};

