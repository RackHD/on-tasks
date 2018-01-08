// Copyright © 2017 Dell Inc. or its subsidiaries. All Rights Reserved.
/* jshint node: true */

'use strict';

describe(require('path').basename(__filename), function() {
    var schemaFileName = 'dell-wsman-discovery.json';

    var canonical = {
        ranges: [
            {
                startIp: '1.1.1.1',
                endIp: '255.255.255.255',
                credentials: {
                    userName: 'test',
                    password: 'test'
                },
                deviceTypesToDiscover: ['SERVER', 'CHASSIS']
            }
        ],
        credentials: {
            userName: 'test',
            password: 'test'
        },
        inventory: true,
        deviceTypesToDiscover: [
            'CHASSIS', 'SERVER'
        ]
    };

    var positiveSetParam = {
        ranges: [
            [
                {
                    startIp: '1.1.1.1',
                    endIp: '255.255.255.255',
                    credentials: {
                        userName: 'test',
                        password: 'test'
                    },
                    deviceTypesToDiscover: ['SERVER', 'CHASSIS']
                }
            ]
        ],
        credentials: [
            {
                userName: 'test',
                password: 'test'
            },
            undefined
        ],
        inventory: [true, false, undefined],
        deviceTypesToDiscover: [
            ['CHASSIS', 'SERVER'],
            [],
            undefined
        ]
    };

    var negativeSetParam = {
        ranges: [
            null, undefined,
            [
                {
                    startIp: '1.1.1.1',
                    endIp: '255.255.255.255',
                    credentials: {
                        userName: 'test',
                        password: 'test'
                    },
                    deviceTypesToDiscover: 'SERVER, CHASSIS'
                }
            ]
        ],
        credentials: [
            null
        ],
        inventory: ['', null],
        deviceTypesToDiscover: [
            '', 'SERVER, CHASSIS', {}, null
        ]
    };

    var positiveUnsetParam = [
        'credentials', 'inventory', 'deviceTypesToDiscover'
    ];

    var negativeUnsetParam = [
        'ranges'
    ];

    var SchemaUtHelper = require('./schema-ut-helper');
    new SchemaUtHelper(schemaFileName, canonical).batchTest(
        positiveSetParam, negativeSetParam, positiveUnsetParam, negativeUnsetParam);
});
