// Copyright 2015, EMC, Inc.

'use strict';

module.exports = {
    friendlyName: 'Catalog bmc',
    injectableName: 'Task.Catalog.bmc',
    implementsTask: 'Task.Base.Linux.Catalog',
    schemaRef: 'linux-catalog.json',
    options: {
        commands: [
            {
                command: 'sudo ipmitool lan print',
                acceptedResponseCodes: [1]
            },
            'sudo ipmitool sel',
            'sudo ipmitool sel list -c',
            'sudo ipmitool mc info',
            {
                command: 'sudo ipmitool user summary 1',
                acceptedResponseCodes: [1]
            },
            {
                command: 'sudo ipmitool -c user list 1',
                acceptedResponseCodes: [1]
            },
            'sudo ipmitool fru',
            {
                command: 'sudo ipmitool lan print 2',
                acceptedResponseCodes: [1]
            },
            {
                command: 'sudo ipmitool user summary 2',
                acceptedResponseCodes: [1]
            },
            {
                command: 'sudo ipmitool -c user list 2',
                acceptedResponseCodes: [1]
            },
            {
                command: 'sudo ipmitool lan print 3',
                acceptedResponseCodes: [1]
            },
            {
                command: 'sudo ipmitool user summary 3',
                acceptedResponseCodes: [1]
            },
            {
                command: 'sudo ipmitool -c user list 3',
                acceptedResponseCodes: [1]
            },
            {
                command: 'sudo ipmitool lan print 4',
                acceptedResponseCodes: [1]
            },
            {
                command: 'sudo ipmitool user summary 4',
                acceptedResponseCodes: [1]
            },
            {
                command: 'sudo ipmitool -c user list 4',
                acceptedResponseCodes: [1]
            },
            {
                command: 'sudo ipmitool lan print 5',
                acceptedResponseCodes: [1]
            },
            {
                command: 'sudo ipmitool user summary 5',
                acceptedResponseCodes: [1]
            },
            {
                command: 'sudo ipmitool -c user list 5',
                acceptedResponseCodes: [1]
            },
            {
                command: 'sudo ipmitool lan print 6',
                acceptedResponseCodes: [1]
            },
            {
                command: 'sudo ipmitool user summary 6',
                acceptedResponseCodes: [1]
            },
            {
                command: 'sudo ipmitool -c user list 6',
                acceptedResponseCodes: [1]
            },
            {
                command: 'sudo ipmitool lan print 7',
                acceptedResponseCodes: [1]
            },
            {
                command: 'sudo ipmitool user summary 7',
                acceptedResponseCodes: [1]
            },
            {
                command: 'sudo ipmitool -c user list 7',
                acceptedResponseCodes: [1]
            },
            {
                command: 'sudo ipmitool lan print 8',
                acceptedResponseCodes: [1]
            },
            {
                command: 'sudo ipmitool user summary 8',
                acceptedResponseCodes: [1]
            },
            {
                command: 'sudo ipmitool -c user list 8',
                acceptedResponseCodes: [1]
            },
            {
                command: 'sudo ipmitool lan print 9',
                acceptedResponseCodes: [1]
            },
            {
                command: 'sudo ipmitool user summary 9',
                acceptedResponseCodes: [1]
            },
            {
                command: 'sudo ipmitool -c user list 9',
                acceptedResponseCodes: [1]
            },
            {
                command: 'sudo ipmitool lan print 10',
                acceptedResponseCodes: [1]
            },
            {
                command: 'sudo ipmitool user summary 10',
                acceptedResponseCodes: [1]
            },
            {
                command: 'sudo ipmitool -c user list 10',
                acceptedResponseCodes: [1]
            },
            {
                command: 'sudo ipmitool lan print 11',
                acceptedResponseCodes: [1]
            },
            {
                command: 'sudo ipmitool user summary 11',
                acceptedResponseCodes: [1]
            },
            {
                command: 'sudo ipmitool -c user list 11',
                acceptedResponseCodes: [1]
            },
            {
                command: 'sudo ipmitool lan print 12',
                acceptedResponseCodes: [1]
            },
            {
                command: 'sudo ipmitool user summary 12',
                acceptedResponseCodes: [1]
            },
            {
                command: 'sudo ipmitool -c user list 12',
                acceptedResponseCodes: [1]
            },
            {
                command: 'sudo ipmitool lan print 13',
                acceptedResponseCodes: [1]
            },
            {
                command: 'sudo ipmitool user summary 13',
                acceptedResponseCodes: [1]
            },
            {
                command: 'sudo ipmitool -c user list 13',
                acceptedResponseCodes: [1]
            },
            {
                command: 'sudo ipmitool lan print 14',
                acceptedResponseCodes: [1]
            },
            {
                command: 'sudo ipmitool user summary 14',
                acceptedResponseCodes: [1]
            },
            {
                command: 'sudo ipmitool -c user list 14',
                acceptedResponseCodes: [1]
            },
            {
                command: 'sudo ipmitool lan print 15',
                acceptedResponseCodes: [1]
            },
            {
                command: 'sudo ipmitool user summary 15',
                acceptedResponseCodes: [1]
            },
            {
                command: 'sudo ipmitool -c user list 15',
                acceptedResponseCodes: [1]
            }
        ]
    },
    properties: {
        catalog: {
            type: 'bmc'
        }
    }
};
