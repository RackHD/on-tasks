// Copyright 2016, EMC, Inc.

'use strict';

module.exports = {
    friendlyName: 'dell wsman update firmware image',
    injectableName: 'Task.Dell.Wsman.Update.Firmware',
    implementsTask: 'Task.Base.Dell.Wsman.Control',
    options: {
        action: 'updateFirmware',
        forceReboot: true
    },
    properties: {}
};

