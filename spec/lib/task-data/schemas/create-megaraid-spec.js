// Copyright 2016, EMC, Inc.
/* jshint node: true */

'use strict';

describe(require('path').basename(__filename), function() {
    var schemaFileName = 'create-megaraid.json';

    var canonical = {
        createDefault: false,
        path: '/opt/monorail/storcli',
        controller: 0,
        raidList: [
            {
                enclosure: 255,
                type: 'raid1',
                drives: [1, 4],
                name: 'vd1'
            },
            {
                enclosure: 0,
                type: 'raid5',
                drives: [2, 6, 7, 8, 9, 0],
                name: 'vd2',
                size: '2TB'
            },
            {
                enclosure: 1,
                type: 'raid60',
                drives: [3, 10, 11, 12, 13, 14],
                name: 'vd3',
                size: '100gb',
                drivePerArray: 2
            },
            {
                enclosure: 2,
                type: 'raid10',
                drives: [0, 1, 2, 3, 4],
                name: 'vd5',
                size: 'all'
            }
        ]
    };

    var positiveSetParam = {
        'createDefault': [true],
        'raidList': [[]],
        'raidList[0].type': ['raid0', 'raid1', 'raid5', 'raid6', 'raid10', 'raid50', 'raid60'],
        'raidList[0].name': ['1234567890ABCD'],
        'raidList[1].size': ['all', 'ALL', '10240000', '6890KB', '6890kb', '1000G', '1000g',
            '2000GB', '2000gb', '300TB', '300tb', '300t', '300T'],
        'raidList[2].drivePerArray': [0, 1, 2, 3, 13, 14, 15]
    };

    var negativeSetParam = {
        'createDefault': [1, null],
        'controller': ['0', -1, 1.9],
        'path': ['', null, 123],
        'raidList[0].type': ['raid2', 'raid3', 'raid4', 'raid', '', null],
        'raidList[0].name': ['1234567890ABCDEF'],
        'raidList[1].size': ['aLL', 'All', 'abc', '9.8', 1000, 1, 10240000],
        'raidList[2].drivePerArray': [-1, 16, 1.2],
        'raidList[0].drives[0]': '4', //cannot set same drive for a RAID.
        'raidList[1]': { //cannot set same RAID option
            enclosure: 255,
            type: 'raid1',
            drives: [1, 4],
            name: 'vd1'
        },
    };

    var positiveUnsetParam = [
        'createDefault',
        'raidList',
        'raidList[2].size', 'raidList[2].drivePerArray'
    ];

    var negativeUnsetParam = [
        'path',
        'controller',
        ['createDefault', 'raidList'],
        'raidList[0].enclosure', 'raidList[0].type', 'raidList[0].drives', 'raidList[0].name'
    ];

    var SchemaUtHelper = require('./schema-ut-helper');
    new SchemaUtHelper(schemaFileName, canonical).batchTest(
        positiveSetParam, negativeSetParam, positiveUnsetParam, negativeUnsetParam);
});
