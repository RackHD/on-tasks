// Copyright 2015, EMC, Inc.

'use strict';

module.exports = {
    friendlyName: 'Catalog S.M.A.R.T',
    injectableName: 'Task.Catalog.smart',
    implementsTask: 'Task.Base.Linux.Catalog',
    schemaRef: 'linux-catalog.json',
    options: {
        commands: [
            {
                command: 'sudo bash get_smart.sh',
                downloadUrl: '/api/current/templates/get_smart.sh'
            }
        ]
    },
    properties: {
        catalog: {
            type: 'smart'
        }
    }
};
