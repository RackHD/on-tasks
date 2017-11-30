// Copyright © 2017 Dell Inc. or its subsidiaries. All Rights Reserved.
/* jshint node: true */

'use strict';

describe(require('path').basename(__filename), function() {
    var schemaFileName = 'dell-wsman-add-volume-getXml.json';

    var canonical = {
        drivers: 'Disk.Virtual.0:RAID.Slot.1-1,Disk.Virtual.1:RAID.Slot.1-1',
        shutdownType: 0
    };

    var positiveSetParam = {
        drivers: ['Disk.Virtual.0:RAID.Slot.1-1', 'Disk.Virtual.0:RAID.Slot.1-1,Disk.Virtual.1:RAID.Slot.1-1'],
        shutdownType: [0,1]
    };

    var negativeSetParam = {
        drivers: [null,false],
        shutdownType: [10, 20]
    };

    var positiveUnsetParam = [
        'shutdownType'
    ];

    var negativeUnsetParam = [
        'drivers'
    ];

    var SchemaUtHelper = require('./schema-ut-helper');
    new SchemaUtHelper(schemaFileName, canonical).batchTest(
        positiveSetParam, negativeSetParam, positiveUnsetParam, negativeUnsetParam);
});
