// Copyright © 2017 Dell Inc. or its subsidiaries. All Rights Reserved.
/* jshint node: true */

'use strict';

describe(require('path').basename(__filename), function() {
    var schemaFileName = 'dell-wsman-add-hotspare-getxml.json';

    var canonical = {
        driveId: 'Disk.Bay.0:Enclosure.Internal.0-0:RAID.Slot.1-1',
        shutdownType: 0
    };

    var positiveSetParam = {
        driveId: ['Disk.Bay.0:Enclosure.Internal.0-0:RAID.Slot.1-1'],
        shutdownType: [0, 1]
    };

    var negativeSetParam = {
        driveId: [null,false],
        shutdownType: [10, 20, ""]
    };

    var positiveUnsetParam = [
        'shutdownType'
    ];

    var negativeUnsetParam = [
        'driveId'
    ];

    var SchemaUtHelper = require('./schema-ut-helper');
    new SchemaUtHelper(schemaFileName, canonical).batchTest(
        positiveSetParam, negativeSetParam, positiveUnsetParam, negativeUnsetParam);
});
