// Copyright 2016, EMC, Inc.

'use strict';

module.exports = {
    friendlyName: 'Remove BMC Credentials',
    injectableName: 'Task.Remove.BMC.Credentials',
    implementsTask: 'Task.Base.Linux.Commands',
    options: {
        user: [],
        commands: [
            {
                command: 'sudo ./remove_bmc_credentials.sh',
                downloadUrl: '/api/1.1/templates/remove_bmc_credentials.sh'
            }
        ]
    },
    properties: {
        os: {
            linux: {
                type: 'microkernel'
            }
        }

    }
};
