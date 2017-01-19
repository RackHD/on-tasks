// Copyright 2015, EMC, Inc.

'use strict';

module.exports = {
    friendlyName: 'Local DMI Catalog',
    injectableName: 'Task.Catalog.Local.DMI',
    implementsTask: 'Task.Base.Local.Catalog',
    schemaRef: 'local-catalog.json',
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
