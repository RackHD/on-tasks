// Copyright 2015, EMC, Inc.

module.exports = {
    friendlyName: 'Provide Catalog Data Values',
    injectableName: 'Task.Base.Catalogs.ProvideValue',
    runJob: 'Job.Catalogs.ProvideData',
    requiredOptions: [
        'source',
        'path'
    ],
    requiredProperties: {},
    properties: {
        context: {}
    }
};
