// Copyright 2016, EMC, Inc.

'use strict';

module.exports = {
    friendlyName: 'Set BMC Credentials',
    injectableName: 'Task.Set.BMC.Credentials',
    implementsTask: 'Task.Base.Linux.Commands',
    optionsSchema: {
        properties: {
            user: {
                description: 'The IPMI user name',
                type: 'string',
                minLength: 1,
                maxLength: 16
            },
            password: {
                description: 'The IPMI password',
                type: 'string',
                minLength: 1,
                maxLength: 20
            }
        },
        required: ['user', 'password']
    },
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
