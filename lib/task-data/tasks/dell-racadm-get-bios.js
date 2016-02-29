// Copyright 2016, EMC, Inc.

'use strict';

module.exports = {
    friendlyName: 'dell racadm get bios',
    injectableName: 'Task.Dell.Racadm.GetBIOS',
    implementsTask: 'Task.Base.Dell.Racadm.GetBIOS',
    options: {
        serverUsername: null,
        serverPassword: null,
        serverFilePath: null,
        action: 'getBiosConfig'
    },
    properties: {}
};
