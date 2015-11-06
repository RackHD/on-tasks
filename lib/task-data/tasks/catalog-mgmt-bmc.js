// Copyright 2015, EMC, Inc.

module.exports = {
    friendlyName: 'Catalog mgmt bmc',
    injectableName: 'Task.Catalog.Mgmt.bmc',
    implementsTask: 'Task.Base.Ipmi.Catalog',
    options: {
        commands: [
            'lan print || true',
            'sel',
            'sel list -c',
            'mc info',
            'user summary 1 || true',
            '-c user list 1 || true',
            'fru',
            'lan print 2 || true',
            'user summary 2 || true',
            '-c user list 2 || true',
            'lan print 3 || true',
            'user summary 3 || true',
            '-c user list 3 || true',
            'lan print 4 || true',
            'user summary 4 || true',
            '-c user list 4 || true',
            'lan print 5 || true',
            'user summary 5 || true',
            '-c user list 5 || true',
            'lan print 6 || true',
            'user summary 6 || true',
            '-c user list 6 || true',
            'lan print 7 || true',
            'user summary 7 || true',
            '-c user list 7 || true',
            'lan print 8 || true',
            'user summary 8 || true',
            '-c user list 8 || true',
            'lan print 9 || true',
            'user summary 9 || true',
            '-c user list 9 || true',
            'lan print 10 || true',
            'user summary 10 || true',
            '-c user list 10 || true',
            'lan print 11 || true',
            'user summary 11 || true',
            '-c user list 11 || true',
            'lan print 12 || true',
            'user summary 12 || true',
            '-c user list 12 || true',
            'lan print 13 || true',
            'user summary 13 || true',
            '-c user list 13 || true',
            'lan print 14 || true',
            'user summary 14 || true',
            '-c user list 14 || true',
            'lan print 15 || true',
            'user summary 15 || true',
            '-c user list 15 || true'
        ],
        acceptedResponseCodes: [1]
    },
    properties: {
        catalog: {
            type: 'bmc'
        }
    }
};
