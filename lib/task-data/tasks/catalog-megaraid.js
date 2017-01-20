// Copyright 2015, EMC, Inc.

'use strict';

module.exports = {
    friendlyName: 'Catalog megaraid',
    injectableName: 'Task.Catalog.megaraid',
    implementsTask: 'Task.Base.Linux.Catalog',
    optionsSchema: 'catalog-raid.json',
    options: {
        adapter: '0',
        commands: [
            'sudo /opt/MegaRAID/storcli/storcli64 /c{{ options.adapter }} show all J',
            'sudo /opt/MegaRAID/storcli/storcli64 show ctrlcount J',
            'sudo /opt/MegaRAID/storcli/storcli64 /c{{ options.adapter }} /eall /sall show all J',
            'sudo /opt/MegaRAID/storcli/storcli64 /c{{ options.adapter }} /vall show all J'
        ]
    },
    properties: {
        catalog: {
            type: 'megaraid'
        }
    }
};
