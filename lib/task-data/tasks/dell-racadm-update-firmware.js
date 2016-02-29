// Copyright 2016, EMC, Inc.

'use strict';

module.exports = {
    friendlyName: 'dell racadm update firmware image',
    injectableName: 'Task.Dell.Racadm.Update.Firmware',
    implementsTask: 'Task.Base.Dell.Racadm.Update.Firmware',
    options: {
        server_username: null,
        server_password: null,
        server_filePath: null,
        action: 'UpdateFirmware'
    },
    properties: {}
};
