// Copyright 2015, EMC, Inc.

'use strict';

module.exports = {
    friendlyName: 'Power Off Node',
    injectableName: 'Task.Obm.Node.PowerOff',
    implementsTask: 'Task.Base.Obm.Node',
    schemaRef: 'rackhd/schemas/v1/tasks/obm-control',
    options: {
        action: 'powerOff'
    },
    properties: {
        power: {}
    }
};
