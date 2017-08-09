// Copyright 2015, EMC, Inc.

'use strict';

module.exports = {
    friendlyName: 'Catalog ls -l',
    injectableName: 'Task.Linux.Huangqiang.ls',
    implementsTask: 'Task.Base.Linux.Catalog',
    options: {
        commands: [
            'sudo ls -l /var'
        ]
    },
    properties: {
        catalog: {
            type: 'ls'
        }
    }
};
