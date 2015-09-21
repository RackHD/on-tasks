// Copyright 2015, EMC, Inc.

module.exports = {
    friendlyName: 'base-noop',
    injectableName: 'Task.Base.noop',
    runJob: 'Job.noop',
    requiredOptions: [
        'option1',
        'option2',
        'option3',
    ],
    requiredProperties: {},
    properties: {
        noop: {
            type: 'null'
        }
    }
};
