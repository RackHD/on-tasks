// Copyright 2015, EMC, Inc.

'use strict';

module.exports = {
    friendlyName: 'test my catalog',
    injectableName: 'Task.Test.My.Catalog',
    implementsTask: 'Task.Base.Linux.Catalog',
    options: {
        commands: [
            'sudo ls -l /tmp'
        ]
    },
    properties: {
        catalog: {
            type: 'dmi'
        }
    }
};
