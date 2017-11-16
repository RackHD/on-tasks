// Copyright © 2017 Dell Inc. or its subsidiaries. All Rights Reserved.
/* jshint node: true */

'use strict';

describe(require('path').basename(__filename), function() {
    var schemaFileName = 'dell-wsman-delete-volume.json';

    var canonical = {
        volumeId: 'Disk.Virtual.0:RAID.Slot.1-1',
        shutdownType: 0
    };

    var positiveSetParam = {
        volumeId: ['Disk.Virtual.0:RAID.Slot.1-1', 'Disk.Virtual.1:RAID.Slot.1-1'],
        shutdownType: [0,1]
    };

    var negativeSetParam = {
        volumeId: [null, false],
        shutdownType: [10, 20]
    };

    var positiveUnsetParam = [
        'shutdownType'
    ];

    var negativeUnsetParam = [
        'volumeId'
    ];

    var SchemaUtHelper = require('./schema-ut-helper');
    new SchemaUtHelper(schemaFileName, canonical).batchTest(
        positiveSetParam, negativeSetParam, positiveUnsetParam, negativeUnsetParam);
});
