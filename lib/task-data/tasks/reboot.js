// Copyright 2015, EMC, Inc.

'use strict';

module.exports = {
    friendlyName: 'Reboot Node',
    injectableName: 'Task.Obm.Node.Reboot',
    implementsTask: 'Task.Base.Obm.Node',
    schemaRef: 'rackhd/schemas/v1/tasks/obm-control',
    options: {
        action: 'reboot'
    },
    properties: {
        power: {
            state: "reboot"
        }
    }
};
