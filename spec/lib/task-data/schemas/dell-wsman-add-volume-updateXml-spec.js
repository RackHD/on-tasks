// Copyright © 2017 Dell Inc. or its subsidiaries. All Rights Reserved.
/* jshint node: true */

'use strict';

describe(require('path').basename(__filename), function() {
    var schemaFileName = 'dell-wsman-add-volume-updateXml.json';

    var canonical = {
        drivers: 'Disk.Virtual.0:RAID.Slot.1-1,Disk.Virtual.1:RAID.Slot.1-1',
        name: 'test1',
        raidLevel: 0,
        stripeSize: 128,
        writePolicy: 'WriteBack'
    };

    var positiveSetParam = {
        drivers: ['Disk.Virtual.0:RAID.Slot.1-1', 'Disk.Virtual.0:RAID.Slot.2-1'],
        name: ['test01', 'test02'],
        raidLevel: [0, 1, 5],
        stripeSize: [128, 256],
        writePolicy: ['WriteBack', 'WriteThrough']
    };

    var negativeSetParam = {
        drivers: [null, true],
        name: [false, 123],
        raidLevel: ['0', null],
        stripeSize: ['128', null],
        writePolicy: [1, null]
    };

    var positiveUnsetParam = [
        'raidLevel', 'stripeSize', 'writePolicy'
    ];

    var negativeUnsetParam = [
        'drivers', 'name'
    ];

    var SchemaUtHelper = require('./schema-ut-helper');
    new SchemaUtHelper(schemaFileName, canonical).batchTest(
        positiveSetParam, negativeSetParam, positiveUnsetParam, negativeUnsetParam);
});
