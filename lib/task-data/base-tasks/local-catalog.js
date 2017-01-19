// Copyright 2015, EMC, Inc.

'use strict';

module.exports = {
    friendlyName: 'Local Catalog Job',
    injectableName: 'Task.Base.Local.Catalog',
    runJob: 'Job.Local.Catalog',
    optionsSchema: 'linux-command.json',
    requiredOptions: [
        'commands'
    ],
    requiredProperties: {
    },
    properties: {
        catalog: {}
    }
};
