// Copyright 2016, EMC, Inc.

'use strict';

module.exports = {
    friendlyName: 'dell racadm get bios',
    injectableName: 'Task.Dell.Racadm.GetBIOS',
    implementsTask: 'Task.Base.Dell.Racadm.GetBIOS',
    options: {
        server_username: null,
        server_password: null,
        server_filePath: null,
        action: 'GetBIOS'
    },
    properties: {}
};
