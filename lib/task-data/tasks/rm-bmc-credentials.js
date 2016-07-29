// Copyright 2016, EMC, Inc.

'use strict';

module.exports = {
    friendlyName: 'Remove BMC Credentials',
    injectableName: 'Task.Remove.BMC.Credentials',
    implementsTask: 'Task.Base.Linux.Commands',
    options: {
        users: [],
        commands: [
            {
                command: 'sudo ./remove_bmc_credentials.sh',
                downloadUrl: '/api/current/templates/remove_bmc_credentials.sh'
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
