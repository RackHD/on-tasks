// Copyright 2015, EMC, Inc.

'use strict';

module.exports = {
    friendlyName: 'Catalog bmc',
    injectableName: 'Task.Catalog.bmc',
    implementsTask: 'Task.Base.Linux.Catalog',
    options: {
        commands: [
            'sudo ipmitool lan print || true',
            'sudo ipmitool sel',
            'sudo ipmitool sel list -c',
            'sudo ipmitool mc info',
            'sudo ipmitool user summary 1 || true',
            'sudo ipmitool -c user list 1 || true',
            'sudo ipmitool fru',
            'sudo ipmitool lan print 2 || true',
            'sudo ipmitool user summary 2 || true',
            'sudo ipmitool -c user list 2 || true',
            'sudo ipmitool lan print 3 || true',
            'sudo ipmitool user summary 3 || true',
            'sudo ipmitool -c user list 3 || true',
            'sudo ipmitool lan print 4 || true',
            'sudo ipmitool user summary 4 || true',
            'sudo ipmitool -c user list 4 || true',
            'sudo ipmitool lan print 5 || true',
            'sudo ipmitool user summary 5 || true',
            'sudo ipmitool -c user list 5 || true',
            'sudo ipmitool lan print 6 || true',
            'sudo ipmitool user summary 6 || true',
            'sudo ipmitool -c user list 6 || true',
            'sudo ipmitool lan print 7 || true',
            'sudo ipmitool user summary 7 || true',
            'sudo ipmitool -c user list 7 || true',
            'sudo ipmitool lan print 8 || true',
            'sudo ipmitool user summary 8 || true',
            'sudo ipmitool -c user list 8 || true',
            'sudo ipmitool lan print 9 || true',
            'sudo ipmitool user summary 9 || true',
            'sudo ipmitool -c user list 9 || true',
            'sudo ipmitool lan print 10 || true',
            'sudo ipmitool user summary 10 || true',
            'sudo ipmitool -c user list 10 || true',
            'sudo ipmitool lan print 11 || true',
            'sudo ipmitool user summary 11 || true',
            'sudo ipmitool -c user list 11 || true',
            'sudo ipmitool lan print 12 || true',
            'sudo ipmitool user summary 12 || true',
            'sudo ipmitool -c user list 12 || true',
            'sudo ipmitool lan print 13 || true',
            'sudo ipmitool user summary 13 || true',
            'sudo ipmitool -c user list 13 || true',
            'sudo ipmitool lan print 14 || true',
            'sudo ipmitool user summary 14 || true',
            'sudo ipmitool -c user list 14 || true',
            'sudo ipmitool lan print 15 || true',
            'sudo ipmitool user summary 15 || true',
            'sudo ipmitool -c user list 15 || true'
        ],
        acceptedResponseCodes: [1]
    },
    properties: {
        catalog: {
            type: 'bmc'
        }
    }
};
