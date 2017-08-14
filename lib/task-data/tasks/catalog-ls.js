// Copyright 2015, EMC, Inc.

'use strict';

module.exports = {
    friendlyName: 'Catalog ls',
    injectableName: 'Task.Catalog.ls',
    implementsTask: 'Task.Base.Linux.Catalog',
    options: {
        commands: [
            'ls -l /var'
        ]
    },
    properties: {
        catalog: {
            type: 'ls'
        }
    }
};
