// Copyright © 2017 Dell Inc. or its subsidiaries. All Rights Reserved.
/* jshint node: true */

'use strict';

describe(require('path').basename(__filename), function() {
    var schemaFileName = 'dell-wsman-add-volume-getXml.json';

    var canonical = {
        drives: 'Disk.Virtual.0:RAID.Slot.1-1,Disk.Virtual.1:RAID.Slot.1-1',
        shutdownType: 0,
        ipAddress: '191.112.41.31',
        username: 'admin',
        password: 'admin'
    };

    var positiveSetParam = {
        drives: ['Disk.Virtual.0:RAID.Slot.1-1', 'Disk.Virtual.0:RAID.Slot.1-1,Disk.Virtual.1:RAID.Slot.1-1'],
        shutdownType: [0,1],
        ipAddress: ['10.21.19.90', '11.65.23.70'],
        username: ['user01', 'user-01'],
        password: ['123456', 'asfewe']
    };

    var negativeSetParam = {
        drives: [null,false],
        shutdownType: [10, 20],
        ipAddress: [1, 2],
        username: [null, true],
        password: [null, 123456]
    };

    var positiveUnsetParam = [
        'shutdownType', 'ipAddress', 'username', 'password'
    ];

    var negativeUnsetParam = [
        'drives'
    ];

    var SchemaUtHelper = require('./schema-ut-helper');
    new SchemaUtHelper(schemaFileName, canonical).batchTest(
        positiveSetParam, negativeSetParam, positiveUnsetParam, negativeUnsetParam);
});
