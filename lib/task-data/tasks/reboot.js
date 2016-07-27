// Copyright 2015, EMC, Inc.

'use strict';

module.exports = {
    friendlyName: 'Reboot Node',
    injectableName: 'Task.Obm.Node.Reboot',
    implementsTask: 'Task.Base.Obm.Node',
    schemaRef: 'obm-control.json',
    options: {
        action: 'reboot'
    },
    properties: {
        power: {
            state: "reboot"
        }
    }
};
