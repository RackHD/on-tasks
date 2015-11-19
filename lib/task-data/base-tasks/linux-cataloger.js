// Copyright 2015, EMC, Inc.

'use strict';

module.exports = {
    friendlyName: 'Linux Cataloger',
    injectableName: 'Task.Base.Linux.Catalog',
    runJob: 'Job.Linux.Catalog',
    requiredOptions: [
        'commands'
    ],
    requiredProperties: {
        'os.linux.type': 'microkernel'
    },
    properties: {
        catalog: {}
    }
};
