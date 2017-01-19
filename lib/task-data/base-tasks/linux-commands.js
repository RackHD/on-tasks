// Copyright 2015, EMC, Inc.

'use strict';

module.exports = {
    friendlyName: 'Linux Commands',
    injectableName: 'Task.Base.Linux.Commands',
    runJob: 'Job.Linux.Commands',
    optionsSchema: 'linux-command.json',
    requiredOptions: [
        'commands'
    ],
    requiredProperties: {},
    properties: {
        commands: {}
    }
};
