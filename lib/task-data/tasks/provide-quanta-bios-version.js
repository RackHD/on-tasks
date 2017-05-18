// Copyright 2015, EMC, Inc.

'use strict';

module.exports = {
    friendlyName: 'Provide Ami Catalog Bios Version',
    injectableName: 'Task.Catalogs.Provide.Ami.BiosVersion',
    implementsTask: 'Task.Base.Catalogs.ProvideValue',
    options: {
        'source': 'ami',
        'path': 'data.systemRomId'
    },
    properties: {
        context: {
            ami: {data: 'systemRomId'}
        }
    }
};
