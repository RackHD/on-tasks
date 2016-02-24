// Copyright 2016, EMC, Inc.

'use strict';


module.exports = {
    friendlyName: 'Base Ssh Task',
    injectableName: 'Task.Base.Ssh',
    runJob: 'Job.Ssh',
    requiredOptions: [
        'commands'
    ],
    properties: {},
    requiredProperties: []
};
