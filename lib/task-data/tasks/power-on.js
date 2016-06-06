// Copyright 2015, EMC, Inc.

'use strict';

module.exports = {
    friendlyName: 'Power On Node',
    injectableName: 'Task.Obm.Node.PowerOn',
    implementsTask: 'Task.Base.Obm.Node',
    schemaRef: 'rackhd/schemas/v1/tasks/obm-control',
    options: {
        action: 'powerOn'
    },
    properties: {
        power: {}
    }
};
