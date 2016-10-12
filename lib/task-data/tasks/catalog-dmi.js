// Copyright 2015, EMC, Inc.

'use strict';

module.exports = {
    friendlyName: 'Catalog dmi',
    injectableName: 'Task.Catalog.dmi',
    implementsTask: 'Task.Base.Linux.Catalog',
    schemaRef: 'linux-catalog.json',
    options: {
        commands: [
            'sudo dmidecode'
        ]
    },
    properties: {
        catalog: {
            type: 'dmi'
        }
    }
};
