// Copyright 2015, EMC, Inc.

module.exports = {
    friendlyName: 'Catalog mgmt bmc',
    injectableName: 'Task.Catalog.Mgmt.bmc',
    implementsTask: 'Task.Base.Ipmi.Catalog',
    options: {
        commands: [
            'lan print',
            'sel',
            'sel list -c',
            '-c user list 1',
            'lan print 2',
            'user summary 2',
            '-c user list 2',
            'lan print 3',
            'user summary 3',
            '-c user list 3',
            'lan print 4',
            'user summary 4',
            '-c user list 4',
            'lan print 5',
            'user summary 5',
            '-c user list 5',
            'lan print 6',
            'user summary 6',
            '-c user list 6',
            'lan print 7',
            'user summary 7',
            '-c user list 7',
            'lan print 8',
            'user summary 8',
            '-c user list 8',
            'lan print 9',
            'user summary 9',
            '-c user list 9',
            'lan print 10',
            'user summary 10',
            '-c user list 10',
            'lan print 11',
            'user summary 11',
            '-c user list 11',
            'lan print 12',
            'user summary 12',
            '-c user list 12',
            'lan print 13',
            'user summary 13',
            '-c user list 13',
            'lan print 14',
            'user summary 14',
            '-c user list 14',
            'lan print 15',
            'user summary 15',
            '-c user list 15',
            'fru'
        ],
        acceptedResponseCodes: [1]
    },
    properties: {
        catalog: {
            type: 'bmc'
        }
    }
};
