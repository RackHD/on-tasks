// Copyright 2015, EMC, Inc.

module.exports = {
    friendlyName: 'Catalog bmc',
    injectableName: 'Task.Catalog.bmc',
    implementsTask: 'Task.Base.Linux.Catalog',
    options: {
        commands: [
            'sudo ipmitool lan print',
            'sudo ipmitool sel',
            'sudo ipmitool sel list -c',
            'sudo ipmitool mc info',
            'sudo ipmitool user summary 1',
            'sudo ipmitool -c user list 1',
            'sudo ipmitool lan print 2',
            'sudo ipmitool user summary 2',
            'sudo ipmitool -c user list 2',
            'sudo ipmitool lan print 3',
            'sudo ipmitool user summary 3',
            'sudo ipmitool -c user list 3',
            'sudo ipmitool lan print 4',
            'sudo ipmitool user summary 4',
            'sudo ipmitool -c user list 4',
            'sudo ipmitool lan print 5',
            'sudo ipmitool user summary 5',
            'sudo ipmitool -c user list 5',
            'sudo ipmitool lan print 6',
            'sudo ipmitool user summary 6',
            'sudo ipmitool -c user list 6',
            'sudo ipmitool lan print 7',
            'sudo ipmitool user summary 7',
            'sudo ipmitool -c user list 7',
            'sudo ipmitool lan print 8',
            'sudo ipmitool user summary 8',
            'sudo ipmitool -c user list 8',
            'sudo ipmitool lan print 9',
            'sudo ipmitool user summary 9',
            'sudo ipmitool -c user list 9',
            'sudo ipmitool lan print 10',
            'sudo ipmitool user summary 10',
            'sudo ipmitool -c user list 10',
            'sudo ipmitool lan print 11',
            'sudo ipmitool user summary 11',
            'sudo ipmitool -c user list 11',
            'sudo ipmitool lan print 12',
            'sudo ipmitool user summary 12',
            'sudo ipmitool -c user list 12',
            'sudo ipmitool lan print 13',
            'sudo ipmitool user summary 13',
            'sudo ipmitool -c user list 13',
            'sudo ipmitool lan print 14',
            'sudo ipmitool user summary 14',
            'sudo ipmitool -c user list 14',
            'sudo ipmitool lan print 15',
            'sudo ipmitool user summary 15',
            'sudo ipmitool -c user list 15',
            'sudo ipmitool fru'
        ],
        acceptedResponseCodes: [1]
    },
    properties: {
        catalog: {
            type: 'bmc'
        }
    }
};
