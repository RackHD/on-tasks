// Copyright © 2017 Dell Inc. or its subsidiaries. All Rights Reserved.
/* jshint node: true */

'use strict';

describe(require('path').basename(__filename), function() {
    var schemaFileName = 'dell-wsman-add-hotspare-updatexml.json';

    var canonical = {
        driveId: 'Disk.Bay.0:Enclosure.Internal.0-0:RAID.Slot.1-1',
        volumeId: 'Disk.Virtual.0:RAID.Slot.1-1',
        hotspareType: 'dhs'
    };

    var positiveSetParam = {
        driveId: ['Disk.Bay.0:Enclosure.Internal.0-0:RAID.Slot.1-1'],
        volumeId: ['Disk.Virtual.0:RAID.Slot.1-1', "", undefined],
        hotspareType: ["dhs", "ghs"]
    };

    var negativeSetParam = {
        driveId: [null, true],
        volumeId: [false, 123],
        hotspareType: [1, "", "test"]
    };

    var positiveUnsetParam = [
        'volumeId'
    ];

    var negativeUnsetParam = [
        'driveId', 'hotspareType'
    ];

    var SchemaUtHelper = require('./schema-ut-helper');
    new SchemaUtHelper(schemaFileName, canonical).batchTest(
        positiveSetParam, negativeSetParam, positiveUnsetParam, negativeUnsetParam);
});
