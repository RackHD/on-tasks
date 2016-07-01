// Copyright 2016, EMC, Inc.

'use strict';

module.exports = {
    friendlyName: 'Dell Racadm Control',
    injectableName: 'Task.Dell.Racadm.Control',
    implementsTask: 'Task.Base.Dell.Racadm.Control',
    options: {
        serverUsername: null,
        serverPassword: null,
        serverFilePath: null,
        forceReboot: true,
        action: null 
    },
    properties: {}
};
