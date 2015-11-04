// Copyright 2015, EMC, Inc.

module.exports = {
    friendlyName: 'Local Catalog Job',
    injectableName: 'Task.Base.Local.Catalog',
    runJob: 'Job.Local.Catalog',
    requiredOptions: [
        'commands'
    ],
    requiredProperties: {
    },
    properties: {
        catalog: {}
    }
};
