// Copyright 2015, EMC, Inc.

module.exports = {
    friendlyName: 'Provide Ami Catalog Bios Version',
    injectableName: 'Task.Catalogs.Provide.Ami.BiosVersion',
    implementsTask: 'Task.Base.Catalogs.ProvideValue',
    options: {
        'source': 'ami',
        'path': 'systemRomId'
    },
    properties: {
        context: {
            ami: 'systemRomId'
        }
    }
};
