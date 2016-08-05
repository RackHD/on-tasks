// Copyright 2015, EMC, Inc.

'use strict';

module.exports = {
    friendlyName: 'Catalog flashupdt',
    injectableName: 'Task.Catalog.flashupdt',
    implementsTask: 'Task.Base.Linux.Catalog',
    schemaRef: 'linux-catalog.json',
    options: {
        commands: [
            'sudo /opt/intel/flashupdt -i'
        ]
    },
    properties: {
        catalog: {
            type: 'flashupdt'
        }
    }
};
