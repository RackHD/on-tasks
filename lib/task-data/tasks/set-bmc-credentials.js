// Copyright 2016, EMC, Inc.

'use strict';

module.exports = {
    friendlyName: 'Set BMC Credentials',
    injectableName: 'Task.Set.BMC.Credentials',
    implementsTask: 'Task.Base.Linux.Commands',
    options: {
        user: '{{ context.user || monorail }}',
        password: '{{ context.password  }}',
        commands: [
            {
                command: 'sudo ./set_bmc_credentials.sh',
                downloadUrl: '/api/1.1/templates/set_bmc_credentials.sh'
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
