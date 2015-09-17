// Copyright 2015, EMC, Inc.

module.exports = {
    friendlyName: 'Create Default Pollers',
    injectableName: 'Task.Base.Pollers.CreateDefault',
    runJob: 'Job.Pollers.CreateDefault',
    requiredOptions: [
        'pollers',
        'nodeId'
    ],
    requiredProperties: {},
    properties: {}
};
