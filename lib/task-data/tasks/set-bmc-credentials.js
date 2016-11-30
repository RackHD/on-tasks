// Copyright 2016, EMC, Inc.

'use strict';

module.exports = {
    friendlyName: 'Set BMC Credentials',
    injectableName: 'Task.Set.BMC.Credentials',
    implementsTask: 'Task.Base.Linux.Commands',
    schemaRef: 'set-bmc-credentials.json',
    options: {
        user: '{{ context.user || monorail }}',
        password: '{{ context.password  }}',
        commands: [
            {
                command: 'sudo ./set_bmc_credentials.sh',
                downloadUrl: '{{ api.templates }}/set_bmc_credentials.sh?nodeId={{ task.nodeId }}'
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
