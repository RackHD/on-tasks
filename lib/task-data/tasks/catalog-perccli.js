// Copyright 2016, EMC, Inc.

'use strict';

module.exports = {
    friendlyName: 'Catalog perccli',
    injectableName: 'Task.Catalog.perccli',
    implementsTask: 'Task.Base.Linux.Catalog',
    options: {
        adapter: '0',
        commands: [
            'sudo /opt/MegaRAID/perccli/perccli64 /c{{ options.adapter }} show all J',
            'sudo /opt/MegaRAID/perccli/perccli64 show ctrlcount J',
            'sudo /opt/MegaRAID/perccli/perccli64 /c{{ options.adapter }} /eall /sall show all J',
            'sudo /opt/MegaRAID/perccli/perccli64 /c{{ options.adapter }} /vall show all J'
        ]
    },
    properties: {
        catalog: {
            type: 'perccli'
        }
    }
};
