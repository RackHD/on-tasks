// Copyright 2016, EMC, Inc.

'use strict';

module.exports = {
    friendlyName: 'dell racadm set bios',
    injectableName: 'Task.Dell.Racadm.SetBIOS',
    implementsTask: 'Task.Base.Dell.Racadm.SetBIOS',
    options: {
        username: null,
        password: null,
        filePath: null
    },
    properties: {}
};

