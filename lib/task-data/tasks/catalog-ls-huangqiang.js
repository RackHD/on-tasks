// Copyright 2015, EMC, Inc.

'use strict';

module.exports = {
    friendlyName: 'Catalog ls huangqiang',
    injectableName: 'Task.Catalog.ls',
    implementsTask: 'Task.Base.Linux.Catalog',
    options: {
        commands: [
            'sudo ls -l'
        ]
    },
    properties: {
        catalog: {
            type: 'ls'
        }
    }
};
