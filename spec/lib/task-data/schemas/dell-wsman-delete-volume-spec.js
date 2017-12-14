// Copyright © 2017 Dell Inc. or its subsidiaries. All Rights Reserved.
/* jshint node: true */

'use strict';

describe(require('path').basename(__filename), function() {
    var schemaFileName = 'dell-wsman-delete-volume.json';

    var canonical = {
        volumeId: 'Disk.Virtual.0:RAID.Slot.1-1',
        shutdownType: 0,
        ipAddress: '10.21.31.67',
        username: 'admin',
        password: 'admin'
    };

    var positiveSetParam = {
        volumeId: ['Disk.Virtual.0:RAID.Slot.1-1', 'Disk.Virtual.1:RAID.Slot.1-1'],
        shutdownType: [0,1],
        ipAddress: ['190.121.10.21', '11.21.67.78'],
        username: ['admin1', 'user01'],
        password: ['123456', 'admin123']
    };

    var negativeSetParam = {
        volumeId: [null, false],
        shutdownType: [10, 20],
        ipAddress: [true, null],
        username: [null, 1111],
        password: [123456, null]
    };

    var positiveUnsetParam = [
        'shutdownType', 'ipAddress', 'username', 'password'
    ];

    var negativeUnsetParam = [
        'volumeId'
    ];

    var SchemaUtHelper = require('./schema-ut-helper');
    new SchemaUtHelper(schemaFileName, canonical).batchTest(
        positiveSetParam, negativeSetParam, positiveUnsetParam, negativeUnsetParam);
});
