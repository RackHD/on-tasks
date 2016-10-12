// Copyright 2015, EMC, Inc.

'use strict';

module.exports = {
    friendlyName: 'Node Obm',
    injectableName: 'Task.Base.Obm.Node',
    runJob: 'Job.Obm.Node',
    requiredOptions: [
        'action'
    ],
    requiredProperties: {},
    properties: {
        power: {}
    }
};
