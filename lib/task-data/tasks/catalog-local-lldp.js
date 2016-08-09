// Copyright 2015, EMC, Inc.

'use strict';

module.exports = {
    friendlyName: 'Local LLDP Catalog',
    injectableName: 'Task.Catalog.Local.LLDP',
    implementsTask: 'Task.Base.Local.Catalog',
    schemaRef: 'linux-catalog.json',
    options: {
        commands: [
            'sudo /usr/sbin/lldpcli show neighbor -f keyvalue'
        ]
    },
    properties: {
        catalog: {
            type: 'lldp'
        }
    }
};
